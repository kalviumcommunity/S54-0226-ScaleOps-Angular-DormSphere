use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};

use crate::models::hostel::{CreateHostel, Hostel, UpdateHostel};

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: &'static str,
    message: &'static str,
}

pub async fn list_hostels(State(pool): State<PgPool>) -> impl IntoResponse {
    let hostels =
        sqlx::query_as::<_, Hostel>("SELECT id, name, location, total_capacity FROM hostels")
            .fetch_all(&pool)
            .await;

    match hostels {
        Ok(data) => Json(data).into_response(),
        Err(err) => {
            eprintln!("Database error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "HOSTELS_FETCH_FAILED",
                    message: "Failed to fetch hostels",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn create_hostel(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateHostel>,
) -> impl IntoResponse {
    let result = sqlx::query_as::<_, Hostel>(
        "INSERT INTO hostels (name, location, total_capacity)
         VALUES ($1, $2, $3)
         RETURNING id, name, location, total_capacity",
    )
    .bind(&payload.name)
    .bind(&payload.location)
    .bind(&payload.total_capacity)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(hostel) => (StatusCode::CREATED, Json(hostel)).into_response(),
        Err(err) => {
            eprintln!("Insert error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "HOSTEL_CREATE_FAILED",
                    message: "Failed to create hostel",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn update_hostel(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateHostel>,
) -> impl IntoResponse {
    let mut query = QueryBuilder::<sqlx::Postgres>::new("UPDATE hostels SET ");
    let mut has_updates = false;

    if let Some(name) = payload.name.as_ref() {
        query.push("name = ").push_bind(name);
        has_updates = true;
    }

    if let Some(location) = payload.location.as_ref() {
        if has_updates {
            query.push(", ");
        }
        query.push("location = ").push_bind(location);
        has_updates = true;
    }

    if let Some(total_capacity) = payload.total_capacity.as_ref() {
        if has_updates {
            query.push(", ");
        }
        query.push("total_capacity = ").push_bind(total_capacity);
        has_updates = true;
    }

    if !has_updates {
        let error_response = ErrorResponse {
            error: ErrorDetail {
                code: "HOSTEL_UPDATE_EMPTY",
                message: "No update fields provided",
            },
        };

        return (StatusCode::BAD_REQUEST, Json(error_response)).into_response();
    }

    query
        .push(" WHERE id = ")
        .push_bind(id)
        .push(" RETURNING id, name, location, total_capacity");

    let result = query.build_query_as::<Hostel>().fetch_one(&pool).await;

    match result {
        Ok(hostel) => Json(hostel).into_response(),
        Err(sqlx::Error::RowNotFound) => {
            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "HOSTEL_NOT_FOUND",
                    message: "Hostel not found",
                },
            };

            (StatusCode::NOT_FOUND, Json(error_response)).into_response()
        }
        Err(err) => {
            eprintln!("Update error: {}", err);

            let error_response = ErrorResponse {
                error: ErrorDetail {
                    code: "HOSTEL_UPDATE_FAILED",
                    message: "Failed to update hostel",
                },
            };

            (StatusCode::INTERNAL_SERVER_ERROR, Json(error_response)).into_response()
        }
    }
}

pub async fn delete_hostel(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM hostels WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                (StatusCode::NOT_FOUND, "Hostel not found").into_response()
            } else {
                (StatusCode::OK, "Hostel deleted successfully").into_response()
            }
        }
        .into_response(),
        Err(err) => {
            eprintln!("Delete error: {}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete hostel").into_response()
        }
    }
}
