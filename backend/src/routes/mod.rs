use axum::{
    Router, http::{HeaderValue, Method, StatusCode}, routing::{delete, get, options, post, put}
};
use sqlx::PgPool;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};

pub mod health;
pub mod hostels;
pub mod auth;
pub mod rooms;

async fn preflight() -> StatusCode {
    StatusCode::NO_CONTENT
}

pub fn create_routes(pool: PgPool) -> Router {
      let raw_allowed_origins = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:4200".to_string());

    let parsed_origins: Vec<HeaderValue> = raw_allowed_origins
        .split(',')
        .filter_map(|value| {
            let origin = value.trim();
            if origin.is_empty() {
                return None;
            }

            match origin.parse::<HeaderValue>() {
                Ok(parsed) => Some(parsed),
                Err(err) => {
                    eprintln!("Ignoring invalid FRONTEND_URL origin '{}': {}", origin, err);
                    None
                }
            }
        })
        .collect();

    let allow_origin = if parsed_origins.is_empty() {
        AllowOrigin::exact(HeaderValue::from_static("http://localhost:4200"))
    } else {
        AllowOrigin::list(parsed_origins)
    };

    let cors = CorsLayer::new()
          .allow_origin(allow_origin)
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
        .route("/api/rooms", get(rooms::list_rooms))
        .route("/api/rooms", post(rooms::create_room))
        .route("/api/rooms", options(preflight))
        .route("/api/rooms/:id", get(rooms::get_room))
        .route("/api/rooms/:id", put(rooms::update_room))
        .route("/api/rooms/:id", delete(rooms::delete_room))
        .route("/api/rooms/:id", options(preflight))
        .layer(cors)
        .with_state(pool)
}

