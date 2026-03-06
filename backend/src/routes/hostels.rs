use axum::{extract:: {State, Path}, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use sqlx::PgPool;

use crate::models::hostel::{Hostel, CreateHostel , UpdateHostel};

#[derive(Serialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: &'static str,
    message: &'static str,
}

pub async fn list_hostels(
    State(pool): State<PgPool>
) -> impl IntoResponse {

    let hostels = sqlx::query_as::<_, Hostel>(
        "SELECT id, name, location, total_capacity FROM hostels"
    )
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
         RETURNING id, name, location, total_capacity"
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to create hostel",
            ).into_response()
        }
    }
}

pub async fn update_hostel(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateHostel>,
) -> impl IntoResponse {

    let result = sqlx::query_as::<_, Hostel>(
        r#"
        UPDATE hostels
        SET
            name = COALESCE($1, name),
            location = COALESCE($2, location),
            total_capacity = COALESCE($3, total_capacity)
        WHERE id = $4
        RETURNING id, name, location, total_capacity
        "#
    )
    .bind(&payload.name)
    .bind(&payload.location)
    .bind(&payload.total_capacity)
    .bind(id)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(hostel) => Json(hostel).into_response(),
        Err(err) => {
            eprintln!("Update error: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update hostel",
            ).into_response()
        }
    }
}

pub async fn delete_hostel(
    Path(id): Path<i32>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {

    let result = sqlx::query(
        "DELETE FROM hostels WHERE id = $1"
    )
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => (
            StatusCode::OK,
            "Hostel deleted successfully",
        ).into_response(),
        Err(err) => {
            eprintln!("Delete error: {}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete hostel",
            ).into_response()
        }
    }
}
