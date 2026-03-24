use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};
use tracing::error;

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
            error!(error = %err, "Failed to fetch rooms");
            map_sqlx_error(&err, "ROOMS_FETCH_FAILED", "Failed to fetch rooms")
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
            not_found("ROOM_NOT_FOUND", "Room not found")
        }
        Err(err) => {
            error!(error = %err, room_id = id, "Failed to fetch room");
            map_sqlx_error(&err, "ROOM_FETCH_FAILED", "Failed to fetch room")
        }
    }
}

pub async fn create_room(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateRoom>,
) -> impl IntoResponse {
    if payload.hostel_id <= 0 {
        return bad_request("ROOM_HOSTEL_INVALID", "hostel_id must be greater than 0");
    }

    let room_number = payload.room_number.trim();
    if room_number.is_empty() {
        return bad_request("ROOM_NUMBER_REQUIRED", "room_number is required");
    }

    if payload.capacity <= 0 {
        return bad_request("ROOM_CAPACITY_INVALID", "capacity must be greater than 0");
    }

    let result = sqlx::query_as::<_, Room>(
        "WITH inserted AS (\n            INSERT INTO rooms (hostel_id, room_number, capacity)\n            VALUES ($1, $2, $3)\n            RETURNING id, hostel_id, room_number, capacity\n        )\n        SELECT inserted.id, inserted.hostel_id, inserted.room_number, inserted.capacity, 0::BIGINT AS occupied_beds\n        FROM inserted",
    )
    .bind(payload.hostel_id)
    .bind(room_number)
    .bind(payload.capacity)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(room) => (StatusCode::CREATED, Json(room)).into_response(),
        Err(err) => {
            error!(error = %err, "Failed to create room");
            map_sqlx_error(&err, "ROOM_CREATE_FAILED", "Failed to create room")
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
        if hostel_id <= 0 {
            return bad_request("ROOM_HOSTEL_INVALID", "hostel_id must be greater than 0");
        }

        query.push("hostel_id = ").push_bind(hostel_id);
        has_updates = true;
    }

    if let Some(room_number) = payload.room_number.as_ref() {
        if has_updates {
            query.push(", ");
        }

        let trimmed = room_number.trim();
        if trimmed.is_empty() {
            return bad_request("ROOM_NUMBER_REQUIRED", "room_number is required");
        }

        query.push("room_number = ").push_bind(trimmed);
        has_updates = true;
    }

    if let Some(capacity) = payload.capacity {
        if capacity <= 0 {
            return bad_request("ROOM_CAPACITY_INVALID", "capacity must be greater than 0");
        }

        if has_updates {
            query.push(", ");
        }

        query.push("capacity = ").push_bind(capacity);
        has_updates = true;
    }

    if !has_updates {
        return bad_request("ROOM_UPDATE_EMPTY", "No update fields provided");
    }

    query.push(" WHERE id = ").push_bind(id);

    let update_result = query.build().execute(&pool).await;

    match update_result {
        Ok(result) if result.rows_affected() == 0 => {
            not_found("ROOM_NOT_FOUND", "Room not found")
        }
        Ok(_) => get_room(Path(id), State(pool)).await.into_response(),
        Err(err) => {
            error!(error = %err, room_id = id, "Failed to update room");
            map_sqlx_error(&err, "ROOM_UPDATE_FAILED", "Failed to update room")
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
                not_found("ROOM_NOT_FOUND", "Room not found")
            } else {
                let success_response = SuccessResponse {
                    message: "Room deleted successfully",
                };

                (StatusCode::OK, Json(success_response)).into_response()
            }
        }
        Err(err) => {
            error!(error = %err, room_id = id, "Failed to delete room");
            map_sqlx_error(&err, "ROOM_DELETE_FAILED", "Failed to delete room")
        }
    }
}

fn bad_request(code: &'static str, message: &'static str) -> Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::BAD_REQUEST, Json(error)).into_response()
}

fn not_found(code: &'static str, message: &'static str) -> Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::NOT_FOUND, Json(error)).into_response()
}

fn service_unavailable(code: &'static str, message: &'static str) -> Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::SERVICE_UNAVAILABLE, Json(error)).into_response()
}

fn internal_error(code: &'static str, message: &'static str) -> Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::INTERNAL_SERVER_ERROR, Json(error)).into_response()
}

fn map_sqlx_error(err: &sqlx::Error, code: &'static str, message: &'static str) -> Response {
    match err {
        sqlx::Error::PoolTimedOut | sqlx::Error::PoolClosed | sqlx::Error::Io(_) => {
            service_unavailable("DB_UNAVAILABLE", "Database temporarily unavailable")
        }
        sqlx::Error::Database(db_err) => match db_err.code().as_deref() {
            Some("42P01") => {
                service_unavailable("DB_SCHEMA_MISSING", "Database schema is not ready")
            }
            Some("23502") | Some("23503") | Some("23505") | Some("23514") | Some("22P02") => {
                bad_request("INVALID_INPUT", "Invalid request data")
            }
            _ => internal_error(code, message),
        },
        _ => internal_error(code, message),
    }
}
