use dotenv::dotenv;
use sqlx::PgPool;
use std::env;
use tokio::net::TcpListener;
use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt};

mod db;
mod models;
mod routes;

#[tokio::main]
async fn main() {
    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            EnvFilter::new("info,sqlx=warn,tower_http=warn,axum=info")
        }))
        .init();

    dotenv().ok();

    let raw_port = env::var("PORT").unwrap_or_else(|_| "8000".to_string());
    let port: u16 = match raw_port.parse() {
        Ok(parsed) => parsed,
        Err(_) => {
            error!(port = %raw_port, "Invalid PORT value; expected number");
            std::process::exit(1);
        }
    };

    let address = format!("0.0.0.0:{}", port);
    info!("App starting");

    let database_url = match env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            error!("DATABASE_URL must be set");
            std::process::exit(1);
        }
    };

    let pool: PgPool = match db::connection::create_pool(&database_url).await {
        Ok(pool) => {
            info!("Database connected successfully");
            pool
        }
        Err(err) => {
            error!(error = %err, "Database connection failed");
            std::process::exit(1);
        }
    };

    let app = routes::create_routes(pool);

    let listener = match TcpListener::bind(&address).await {
        Ok(listener) => listener,
        Err(err) => {
            error!(address = %address, error = %err, "Failed to bind TCP listener");
            std::process::exit(1);
        }
    };

    info!("Server running");

    if let Err(err) = axum::serve(listener, app).await {
        error!(error = %err, "Server terminated unexpectedly");
        std::process::exit(1);
    }
}
