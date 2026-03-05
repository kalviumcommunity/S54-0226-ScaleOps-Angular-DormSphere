use axum::{Router, routing::get};
use sqlx::PgPool;

pub mod health;
pub mod hostels;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/hostels", get(hostels::list_hostels))
        .with_state(pool)
}