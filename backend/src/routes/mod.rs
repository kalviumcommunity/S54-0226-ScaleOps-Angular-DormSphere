use axum::{
    Router, http::{Method, StatusCode}, routing::{delete, get, options, post, put}
};
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};

pub mod health;
pub mod hostels;
pub mod auth;

async fn preflight() -> StatusCode {
    StatusCode::NO_CONTENT
}

pub fn create_routes(pool: PgPool) -> Router {
      let cors = CorsLayer::new()
          .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/login", post(auth::login).options(preflight))
        .route("/api/hostels", get(hostels::list_hostels))
        .route("/api/hostels", post(hostels::create_hostel))
        .route("/api/hostels", options(preflight))
        .route(
            "/api/hostels/:id",
            put(hostels::update_hostel)
        )
        .route("/api/hostels/:id", options(preflight))
        .route("/api/hostels/:id", delete(hostels::delete_hostel))
        .layer(cors)
        .with_state(pool)
}

