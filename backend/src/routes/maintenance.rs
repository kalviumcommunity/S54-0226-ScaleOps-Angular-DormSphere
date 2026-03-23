use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};

use crate::models::maintenance::{
    CreateMaintenanceRequest, MaintenanceRequest, UpdateMaintenanceRequest,
};

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

pub async fn list_requests(State(pool): State<PgPool>) -> impl IntoResponse {
    let result = sqlx::query_as::<_, MaintenanceRequest>(
        "SELECT\n            m.id,\n            m.room_id,\n            r.room_number,\n            h.id AS hostel_id,\n            h.name AS hostel_name,\n            m.description,\n            UPPER(COALESCE(m.status, 'OPEN')) AS status,\n            to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at\n        FROM maintenance_requests m\n        LEFT JOIN rooms r ON r.id = m.room_id\n        LEFT JOIN hostels h ON h.id = r.hostel_id\n        ORDER BY m.created_at DESC",
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(data) => Json(data).into_response(),
        Err(err) => {
            eprintln!("Database error: {}", err);
            internal_error("MAINTENANCE_FETCH_FAILED", "Failed to fetch maintenance requests")
        }
    }
}

pub async fn get_request(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    match fetch_by_id(&pool, id).await {
        Ok(request) => Json(request).into_response(),
        Err(sqlx::Error::RowNotFound) => {
            not_found("MAINTENANCE_NOT_FOUND", "Maintenance request not found")
        }
        Err(err) => {
            eprintln!("Database error: {}", err);
            internal_error("MAINTENANCE_FETCH_FAILED", "Failed to fetch maintenance request")
        }
    }
}

pub async fn create_request(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateMaintenanceRequest>,
) -> impl IntoResponse {
    let status = normalize_status(payload.status.as_deref());

    let insert_result = sqlx::query_scalar::<_, i32>(
        "INSERT INTO maintenance_requests (room_id, description, status)\n         VALUES ($1, $2, $3)\n         RETURNING id",
    )
    .bind(payload.room_id)
    .bind(payload.description.trim())
    .bind(status)
    .fetch_one(&pool)
    .await;

    let id = match insert_result {
        Ok(value) => value,
        Err(err) => {
            eprintln!("Insert error: {}", err);
            return internal_error("MAINTENANCE_CREATE_FAILED", "Failed to create maintenance request");
        }
    };

    match fetch_by_id(&pool, id).await {
        Ok(request) => (StatusCode::CREATED, Json(request)).into_response(),
        Err(err) => {
            eprintln!("Fetch created request error: {}", err);
            internal_error("MAINTENANCE_CREATE_FAILED", "Failed to create maintenance request")
        }
    }
}

pub async fn update_request(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateMaintenanceRequest>,
) -> impl IntoResponse {
    let mut query = QueryBuilder::<sqlx::Postgres>::new("UPDATE maintenance_requests SET ");
    let mut has_updates = false;

    if let Some(room_id) = payload.room_id {
        query.push("room_id = ").push_bind(room_id);
        has_updates = true;
    }

    if let Some(description) = payload.description.as_ref() {
        if has_updates {
            query.push(", ");
        }

        query.push("description = ").push_bind(description.trim());
        has_updates = true;
    }

    if let Some(status) = payload.status.as_ref() {
        if has_updates {
            query.push(", ");
        }

        query
            .push("status = ")
            .push_bind(normalize_status(Some(status.as_str())));
        has_updates = true;
    }

    if !has_updates {
        return bad_request("MAINTENANCE_UPDATE_EMPTY", "No update fields provided");
    }

    query.push(" WHERE id = ").push_bind(id);

    let update_result = query.build().execute(&pool).await;

    match update_result {
        Ok(done) if done.rows_affected() == 0 => {
            not_found("MAINTENANCE_NOT_FOUND", "Maintenance request not found")
        }
        Ok(_) => match fetch_by_id(&pool, id).await {
            Ok(request) => Json(request).into_response(),
            Err(err) => {
                eprintln!("Fetch updated request error: {}", err);
                internal_error("MAINTENANCE_UPDATE_FAILED", "Failed to update maintenance request")
            }
        },
        Err(err) => {
            eprintln!("Update error: {}", err);
            internal_error("MAINTENANCE_UPDATE_FAILED", "Failed to update maintenance request")
        }
    }
}

pub async fn delete_request(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM maintenance_requests WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(done) => {
            if done.rows_affected() == 0 {
                return not_found("MAINTENANCE_NOT_FOUND", "Maintenance request not found");
            }

            let response = SuccessResponse {
                message: "Maintenance request deleted successfully",
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(err) => {
            eprintln!("Delete error: {}", err);
            internal_error("MAINTENANCE_DELETE_FAILED", "Failed to delete maintenance request")
        }
    }
}

async fn fetch_by_id(pool: &PgPool, id: i32) -> Result<MaintenanceRequest, sqlx::Error> {
    sqlx::query_as::<_, MaintenanceRequest>(
        "SELECT\n            m.id,\n            m.room_id,\n            r.room_number,\n            h.id AS hostel_id,\n            h.name AS hostel_name,\n            m.description,\n            UPPER(COALESCE(m.status, 'OPEN')) AS status,\n            to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at\n        FROM maintenance_requests m\n        LEFT JOIN rooms r ON r.id = m.room_id\n        LEFT JOIN hostels h ON h.id = r.hostel_id\n        WHERE m.id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await
}

fn normalize_status(value: Option<&str>) -> String {
    let normalized = value.unwrap_or("OPEN").trim().to_uppercase();

    if normalized == "IN_PROGRESS" || normalized == "RESOLVED" {
        return normalized;
    }

    if normalized == "PENDING" || normalized == "OPEN" {
        return "OPEN".to_string();
    }

    "OPEN".to_string()
}

fn bad_request(code: &'static str, message: &'static str) -> axum::response::Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::BAD_REQUEST, Json(error)).into_response()
}

fn not_found(code: &'static str, message: &'static str) -> axum::response::Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::NOT_FOUND, Json(error)).into_response()
}

fn internal_error(code: &'static str, message: &'static str) -> axum::response::Response {
    let error = ErrorResponse {
        error: ErrorDetail { code, message },
    };

    (StatusCode::INTERNAL_SERVER_ERROR, Json(error)).into_response()
}
