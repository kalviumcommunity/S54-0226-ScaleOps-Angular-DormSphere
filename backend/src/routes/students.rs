use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, QueryBuilder};
use tracing::error;

use crate::models::student::{CreateStudent, Student, UpdateStudent};

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

pub async fn list_students(State(pool): State<PgPool>) -> impl IntoResponse {
    let students = sqlx::query_as::<_, Student>(
        "SELECT\n            s.id,\n            s.name,\n            s.email,\n            s.phone,\n            s.department,\n            s.status,\n            s.avatar_url,\n            a.room_id,\n            r.room_number,\n            h.id AS hostel_id,\n            h.name AS hostel_name\n        FROM students s\n        LEFT JOIN allocations a ON a.student_id = s.id\n        LEFT JOIN rooms r ON r.id = a.room_id\n        LEFT JOIN hostels h ON h.id = r.hostel_id\n        ORDER BY s.name",
    )
    .fetch_all(&pool)
    .await;

    match students {
        Ok(data) => Json(data).into_response(),
        Err(err) => {
            error!(error = %err, "Failed to fetch students");
            map_sqlx_error(&err, "STUDENTS_FETCH_FAILED", "Failed to fetch students")
        }
    }
}

pub async fn get_student(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    match fetch_student_by_id(&pool, id).await {
        Ok(student) => Json(student).into_response(),
        Err(sqlx::Error::RowNotFound) => not_found("STUDENT_NOT_FOUND", "Student not found"),
        Err(err) => {
            error!(error = %err, student_id = id, "Failed to fetch student");
            map_sqlx_error(&err, "STUDENT_FETCH_FAILED", "Failed to fetch student")
        }
    }
}

pub async fn create_student(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateStudent>,
) -> impl IntoResponse {
    let name = payload.name.trim();
    if name.is_empty() {
        return bad_request("STUDENT_NAME_REQUIRED", "name is required");
    }

    let email = payload.email.trim();
    if email.is_empty() || !email.contains('@') {
        return bad_request("STUDENT_EMAIL_INVALID", "Valid email is required");
    }

    if let Some(room_id) = payload.room_id {
        if room_id <= 0 {
            return bad_request("STUDENT_ROOM_INVALID", "room_id must be greater than 0");
        }
    }

    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(err) => {
            error!(error = %err, "Failed to start create student transaction");
            return map_sqlx_error(&err, "STUDENT_CREATE_FAILED", "Failed to create student");
        }
    };

    let default_status = payload
        .status
        .as_ref()
        .map(|value| value.trim().to_uppercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "ACTIVE".to_string());

    if !matches!(default_status.as_str(), "ACTIVE" | "PENDING" | "GRADUATED") {
        return bad_request(
            "STUDENT_STATUS_INVALID",
            "status must be ACTIVE, PENDING, or GRADUATED",
        );
    }

    let insert_student = sqlx::query_scalar::<_, i32>(
        "INSERT INTO students (name, email, phone, department, status, avatar_url)\n         VALUES ($1, $2, $3, $4, $5, $6)\n         RETURNING id",
    )
    .bind(name)
    .bind(email)
    .bind(payload.phone.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()))
    .bind(
        payload
            .department
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty()),
    )
    .bind(default_status)
    .bind(
        payload
            .avatar_url
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty()),
    )
    .fetch_one(&mut *tx)
    .await;

    let student_id = match insert_student {
        Ok(id) => id,
        Err(err) => {
            error!(error = %err, "Failed to insert student");
            return map_sqlx_error(&err, "STUDENT_CREATE_FAILED", "Failed to create student");
        }
    };

    if let Some(room_id) = payload.room_id {
        let allocation_result = sqlx::query(
            "INSERT INTO allocations (student_id, room_id)\n             VALUES ($1, $2)\n             ON CONFLICT (student_id) DO UPDATE SET room_id = EXCLUDED.room_id",
        )
        .bind(student_id)
        .bind(room_id)
        .execute(&mut *tx)
        .await;

        if let Err(err) = allocation_result {
            error!(error = %err, student_id = student_id, "Failed to create allocation");
            return map_sqlx_error(&err, "STUDENT_CREATE_FAILED", "Failed to create student");
        }
    }

    if let Err(err) = tx.commit().await {
        error!(error = %err, "Failed to commit create student transaction");
        return map_sqlx_error(&err, "STUDENT_CREATE_FAILED", "Failed to create student");
    }

    match fetch_student_by_id(&pool, student_id).await {
        Ok(student) => (StatusCode::CREATED, Json(student)).into_response(),
        Err(err) => {
            error!(error = %err, student_id = student_id, "Failed to fetch created student");
            map_sqlx_error(&err, "STUDENT_CREATE_FAILED", "Failed to create student")
        }
    }
}

pub async fn update_student(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateStudent>,
) -> impl IntoResponse {
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(err) => {
            error!(error = %err, student_id = id, "Failed to start update transaction");
            return map_sqlx_error(&err, "STUDENT_UPDATE_FAILED", "Failed to update student");
        }
    };

    let mut query = QueryBuilder::<sqlx::Postgres>::new("UPDATE students SET ");
    let mut has_updates = false;

    if let Some(name) = payload.name.as_ref() {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return bad_request("STUDENT_NAME_REQUIRED", "name is required");
        }

        query.push("name = ").push_bind(trimmed);
        has_updates = true;
    }

    if let Some(email) = payload.email.as_ref() {
        let trimmed = email.trim();
        if trimmed.is_empty() || !trimmed.contains('@') {
            return bad_request("STUDENT_EMAIL_INVALID", "Valid email is required");
        }

        if has_updates {
            query.push(", ");
        }

        query.push("email = ").push_bind(trimmed);
        has_updates = true;
    }

    if let Some(phone) = payload.phone.as_ref() {
        if has_updates {
            query.push(", ");
        }

        let value = phone
            .as_ref()
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty());

        query.push("phone = ").push_bind(value);
        has_updates = true;
    }

    if let Some(department) = payload.department.as_ref() {
        if has_updates {
            query.push(", ");
        }

        let value = department
            .as_ref()
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty());

        query.push("department = ").push_bind(value);
        has_updates = true;
    }

    if let Some(status) = payload.status.as_ref() {
        let normalized = status.trim().to_uppercase();
        // Only update status if it is one of the supported lifecycle values.
        if matches!(normalized.as_str(), "ACTIVE" | "PENDING" | "GRADUATED") {
            if has_updates {
                query.push(", ");
            }
            query.push("status = ").push_bind(normalized);
            has_updates = true;
        }
    }

    if let Some(avatar_url) = payload.avatar_url.as_ref() {
        if has_updates {
            query.push(", ");
        }

        let value = avatar_url
            .as_ref()
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty());

        query.push("avatar_url = ").push_bind(value);
        has_updates = true;
    }

    if has_updates {
        query.push(" WHERE id = ").push_bind(id);

        let result = query.build().execute(&mut *tx).await;

        match result {
            Ok(done) if done.rows_affected() == 0 => {
                return not_found("STUDENT_NOT_FOUND", "Student not found");
            }
            Ok(_) => {}
            Err(err) => {
                error!(error = %err, student_id = id, "Failed to update student row");
                return map_sqlx_error(&err, "STUDENT_UPDATE_FAILED", "Failed to update student");
            }
        }
    }

    if let Some(room_id) = payload.room_id {
        let allocation_result = match room_id {
            Some(value) => {
                if value <= 0 {
                    return bad_request("STUDENT_ROOM_INVALID", "room_id must be greater than 0");
                }

                sqlx::query(
                    "INSERT INTO allocations (student_id, room_id)\n                     VALUES ($1, $2)\n                     ON CONFLICT (student_id) DO UPDATE SET room_id = EXCLUDED.room_id",
                )
                .bind(id)
                .bind(value)
                .execute(&mut *tx)
                .await
            }
            None => {
                sqlx::query("DELETE FROM allocations WHERE student_id = $1")
                    .bind(id)
                    .execute(&mut *tx)
                    .await
            }
        };

        if let Err(err) = allocation_result {
            error!(error = %err, student_id = id, "Failed to update student allocation");
            return map_sqlx_error(&err, "STUDENT_UPDATE_FAILED", "Failed to update student");
        }
    }

    if !has_updates && payload.room_id.is_none() {
        return bad_request("STUDENT_UPDATE_EMPTY", "No update fields provided");
    }

    if let Err(err) = tx.commit().await {
        error!(error = %err, student_id = id, "Failed to commit update transaction");
        return map_sqlx_error(&err, "STUDENT_UPDATE_FAILED", "Failed to update student");
    }

    match fetch_student_by_id(&pool, id).await {
        Ok(student) => Json(student).into_response(),
        Err(sqlx::Error::RowNotFound) => not_found("STUDENT_NOT_FOUND", "Student not found"),
        Err(err) => {
            error!(error = %err, student_id = id, "Failed to fetch updated student");
            map_sqlx_error(&err, "STUDENT_UPDATE_FAILED", "Failed to update student")
        }
    }
}

pub async fn delete_student(Path(id): Path<i32>, State(pool): State<PgPool>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM students WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                not_found("STUDENT_NOT_FOUND", "Student not found")
            } else {
                let response = SuccessResponse {
                    message: "Student deleted successfully",
                };

                (StatusCode::OK, Json(response)).into_response()
            }
        }
        Err(err) => {
            error!(error = %err, student_id = id, "Failed to delete student");
            map_sqlx_error(&err, "STUDENT_DELETE_FAILED", "Failed to delete student")
        }
    }
}

async fn fetch_student_by_id(pool: &PgPool, id: i32) -> Result<Student, sqlx::Error> {
    sqlx::query_as::<_, Student>(
        "SELECT\n            s.id,\n            s.name,\n            s.email,\n            s.phone,\n            s.department,\n            s.status,\n            s.avatar_url,\n            a.room_id,\n            r.room_number,\n            h.id AS hostel_id,\n            h.name AS hostel_name\n        FROM students s\n        LEFT JOIN allocations a ON a.student_id = s.id\n        LEFT JOIN rooms r ON r.id = a.room_id\n        LEFT JOIN hostels h ON h.id = r.hostel_id\n        WHERE s.id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await
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
