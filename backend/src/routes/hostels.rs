use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};
use tracing::error;

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

#[derive(Serialize)]
struct SuccessResponse {
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
            error!(error = %err, "Failed to fetch hostels");
            map_sqlx_error(&err, "HOSTELS_FETCH_FAILED", "Failed to fetch hostels")
        }
    }
}

pub async fn create_hostel(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateHostel>,
) -> impl IntoResponse {
    let name = payload.name.trim();
    if name.is_empty() {
        return bad_request("HOSTEL_NAME_REQUIRED", "Hostel name is required");
    }

    if let Some(total_capacity) = payload.total_capacity {
        if total_capacity < 0 {
            return bad_request(
                "HOSTEL_CAPACITY_INVALID",
                "total_capacity must be greater than or equal to 0",
            );
        }
    }

    let location = payload
        .location
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty());

    let result = sqlx::query_as::<_, Hostel>(
        "INSERT INTO hostels (name, location, total_capacity)
         VALUES ($1, $2, $3)
         RETURNING id, name, location, total_capacity",
    )
    .bind(name)
    .bind(location)
    .bind(payload.total_capacity)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(hostel) => (StatusCode::CREATED, Json(hostel)).into_response(),
        Err(err) => {
            error!(error = %err, "Failed to create hostel");
            map_sqlx_error(&err, "HOSTEL_CREATE_FAILED", "Failed to create hostel")
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
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return bad_request("HOSTEL_NAME_REQUIRED", "Hostel name is required");
        }

        query.push("name = ").push_bind(trimmed);
        has_updates = true;
    }

    if let Some(location) = payload.location.as_ref() {
        if has_updates {
            query.push(", ");
        }

        let normalized_location = location
            .as_ref()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        query.push("location = ").push_bind(normalized_location);
        has_updates = true;
    }

    if let Some(total_capacity) = payload.total_capacity.as_ref() {
        if has_updates {
            query.push(", ");
        }

        if let Some(value) = total_capacity {
            if *value < 0 {
                return bad_request(
                    "HOSTEL_CAPACITY_INVALID",
                    "total_capacity must be greater than or equal to 0",
                );
            }
        }

        query.push("total_capacity = ").push_bind(total_capacity);
        has_updates = true;
    }

    if !has_updates {
        return bad_request("HOSTEL_UPDATE_EMPTY", "No update fields provided");
    }

    query
        .push(" WHERE id = ")
        .push_bind(id)
        .push(" RETURNING id, name, location, total_capacity");

    let result = query.build_query_as::<Hostel>().fetch_one(&pool).await;

    match result {
        Ok(hostel) => Json(hostel).into_response(),
        Err(sqlx::Error::RowNotFound) => {
            not_found("HOSTEL_NOT_FOUND", "Hostel not found")
        }
        Err(err) => {
            error!(error = %err, hostel_id = id, "Failed to update hostel");
            map_sqlx_error(&err, "HOSTEL_UPDATE_FAILED", "Failed to update hostel")
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
                not_found("HOSTEL_NOT_FOUND", "Hostel not found")
            } else {
                (
                    StatusCode::OK,
                    Json(SuccessResponse {
                        message: "Hostel deleted successfully",
                    }),
                )
                    .into_response()
            }
        }
        Err(err) => {
            error!(error = %err, hostel_id = id, "Failed to delete hostel");
            map_sqlx_error(&err, "HOSTEL_DELETE_FAILED", "Failed to delete hostel")
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
