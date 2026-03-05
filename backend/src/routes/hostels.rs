use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use sqlx::PgPool;

use crate::models::hostel::Hostel;

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