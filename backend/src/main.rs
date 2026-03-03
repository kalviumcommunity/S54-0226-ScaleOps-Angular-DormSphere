use tokio::net::TcpListener;
use std::env;
use dotenv::dotenv;
use sqlx::PgPool;

mod db;
mod routes;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let port = env::var("PORT").unwrap_or("8000".to_string());
    let address = format!("0.0.0.0:{}", port);
    let database_url = env::var("DATABASE_URL")
    .expect("DATABASE_URL must be set before starting the server");

    // Create DB connection pool
    let pool: PgPool = db::connection::create_pool(&database_url)
        .await
        .expect("Failed to connect to database");

    println!("Database connected successfully");

    // Create routes
    let app = routes::create_routes(pool);

    let listener = TcpListener::bind(&address)
        .await
        .unwrap();

    println!("Server running on http://{}", address);

    axum::serve(listener, app)
        .await
        .expect("Failed to bind to address");
}