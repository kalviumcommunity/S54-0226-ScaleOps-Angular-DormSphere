use axum::{
    Router,
    http::{HeaderValue, Method},
    routing::{get, post, put},
};
use sqlx::PgPool;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};

pub mod health;
pub mod hostels;
pub mod auth;
pub mod rooms;
pub mod students;
pub mod maintenance;

pub fn create_routes(pool: PgPool) -> Router {
    // 🌐 Allow frontend URL from ENV
    let raw_allowed_origins = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:4200".to_string());

    let parsed_origins: Vec<HeaderValue> = raw_allowed_origins
        .split(',')
        .filter_map(|value| value.trim().parse::<HeaderValue>().ok())
        .collect();

    // 🔥 Fallback to allow all (safe for now, restrict later)
    let allow_origin = if parsed_origins.is_empty() {
        AllowOrigin::any()
    } else {
        AllowOrigin::list(parsed_origins)
    };

    let cors = CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any);

    Router::new()
        // Health
        .route("/health", get(health::health_check))

        // Auth
        .route("/api/login", post(auth::login))

        // Hostels
        .route("/api/hostels", get(hostels::list_hostels).post(hostels::create_hostel))
        .route("/api/hostels/:id", put(hostels::update_hostel).delete(hostels::delete_hostel))

        // Rooms
        .route("/api/rooms", get(rooms::list_rooms).post(rooms::create_room))
        .route("/api/rooms/:id", get(rooms::get_room).put(rooms::update_room).delete(rooms::delete_room))

        // Students
        .route("/api/students", get(students::list_students).post(students::create_student))
        .route("/api/students/:id", get(students::get_student).put(students::update_student).delete(students::delete_student))

        // Maintenance
        .route("/api/maintenance", get(maintenance::list_requests).post(maintenance::create_request))
        .route("/api/maintenance/:id", get(maintenance::get_request).put(maintenance::update_request).delete(maintenance::delete_request))

        // 🔥 Apply CORS globally
        .layer(cors)

        .with_state(pool)
}

