use axum::{Router, routing::get};
use sqlx::PgPool;

pub mod health;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health::health_check))
        .with_state(pool)
}