use axum::{extract::State, Json, response::IntoResponse};
use sqlx::PgPool;

use crate::models::hostel::Hostel;

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
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch hostels",
            ).into_response()
        }
    }
}