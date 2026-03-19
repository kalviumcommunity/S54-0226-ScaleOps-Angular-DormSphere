use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};

use crate::models::room::{CreateRoom, Room, UpdateRoom};

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct SuccessResponse {
    message: &'static str,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: &'static str,
    message: &'static str,
}

pub async fn list_rooms(State(pool): State<PgPool>) -> impl IntoResponse {
    let rooms = sqlx::query_as::<_, Room>(
        "SELECT\n            r.id,\n            r.hostel_id,\n            r.room_number,\n            r.capacity,\n            COALESCE(COUNT(a.id), 0) AS occupied_beds\n        FROM rooms r\n        LEFT JOIN allocations a ON a.room_id = r.id\n        GROUP BY r.id, r.hostel_id, r.room_number, r.capacity\n        ORDER BY r.hostel_id, r.room_number",
    )
    .fetch_all(&pool)
    .await;

    match rooms {
        Ok(data) => Json(data).into_response(),
        Err(err) => {
            eprintln!("Database error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOMS_FETCH_FAILED",
                    message: "Failed to fetch rooms",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn get_room(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    let room = sqlx::query_as::<_, Room>(
        "SELECT\n            r.id,\n            r.hostel_id,\n            r.room_number,\n            r.capacity,\n            COALESCE(COUNT(a.id), 0) AS occupied_beds\n        FROM rooms r\n        LEFT JOIN allocations a ON a.room_id = r.id\n        WHERE r.id = $1\n        GROUP BY r.id, r.hostel_id, r.room_number, r.capacity",
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match room {
        Ok(data) => Json(data).into_response(),
        Err(sqlx::Error::RowNotFound) => {
            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_NOT_FOUND",
                    message: "Room not found",
                },
            };

            (StatusCode::NOT_FOUND, Json(error_response)).into_response()
        }
        Err(err) => {
            eprintln!("Database error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_FETCH_FAILED",
                    message: "Failed to fetch room",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn create_room(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateRoom>,
) -> impl IntoResponse {
    let result = sqlx::query_as::<_, Room>(
        "WITH inserted AS (\n            INSERT INTO rooms (hostel_id, room_number, capacity)\n            VALUES ($1, $2, $3)\n            RETURNING id, hostel_id, room_number, capacity\n        )\n        SELECT inserted.id, inserted.hostel_id, inserted.room_number, inserted.capacity, 0::BIGINT AS occupied_beds\n        FROM inserted",
    )
    .bind(payload.hostel_id)
    .bind(payload.room_number.trim())
    .bind(payload.capacity.max(1))
    .fetch_one(&pool)
    .await;

    match result {
        Ok(room) => (StatusCode::CREATED, Json(room)).into_response(),
        Err(err) => {
            eprintln!("Insert error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_CREATE_FAILED",
                    message: "Failed to create room",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn update_room(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateRoom>,
) -> impl IntoResponse {
    let mut query = QueryBuilder::<sqlx::Postgres>::new("UPDATE rooms SET ");
    let mut has_updates = false;

    if let Some(hostel_id) = payload.hostel_id {
        query.push("hostel_id = ").push_bind(hostel_id);
        has_updates = true;
    }

    if let Some(room_number) = payload.room_number.as_ref() {
        if has_updates {
            query.push(", ");
        }

        query.push("room_number = ").push_bind(room_number.trim());
        has_updates = true;
    }

    if let Some(capacity) = payload.capacity {
        if has_updates {
            query.push(", ");
        }

        query.push("capacity = ").push_bind(capacity.max(1));
        has_updates = true;
    }

    if !has_updates {
        let error_response = ErrorResponse {
            error: ErrorDetail {
                code: "ROOM_UPDATE_EMPTY",
                message: "No update fields provided",
            },
        };

        return (StatusCode::BAD_REQUEST, Json(error_response)).into_response();
    }

    query.push(" WHERE id = ").push_bind(id);

    let update_result = query.build().execute(&pool).await;

    match update_result {
        Ok(result) if result.rows_affected() == 0 => {
            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_NOT_FOUND",
                    message: "Room not found",
                },
            };

            (StatusCode::NOT_FOUND, Json(error_response)).into_response()
        }
        Ok(_) => get_room(Path(id), State(pool)).await.into_response(),
        Err(err) => {
            eprintln!("Update error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_UPDATE_FAILED",
                    message: "Failed to update room",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn delete_room(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM rooms WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                let error_response = ErrorResponse {
                    error: ErrorDetail {
                        code: "ROOM_NOT_FOUND",
                        message: "Room not found",
                    },
                };

                (StatusCode::NOT_FOUND, Json(error_response)).into_response()
            } else {
                let success_response = SuccessResponse {
                    message: "Room deleted successfully",
                };

                (StatusCode::OK, Json(success_response)).into_response()
            }
        }
        Err(err) => {
            eprintln!("Delete error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "ROOM_DELETE_FAILED",
                    message: "Failed to delete room",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}
