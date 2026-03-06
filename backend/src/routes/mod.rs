use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::PgPool;

pub mod health;
pub mod hostels;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/hostels", get(hostels::list_hostels))
        .route("/api/hostels", post(hostels::create_hostel))
        .route(
            "/api/hostels/:id",
            put(hostels::update_hostel)
        )
        .route("/api/hostels/:id", delete(hostels::delete_hostel))
        .with_state(pool)
}
