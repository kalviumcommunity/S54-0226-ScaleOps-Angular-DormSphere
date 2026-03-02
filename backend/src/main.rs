use axum::{routing::get, Router};
use tokio::net::TcpListener;
use std::env;
use dotenv::dotenv;
use sqlx::PgPool;

mod db;

async fn root() -> &'static str {
    "DormSphere API Running"
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let port = env::var("PORT").unwrap_or("8000".to_string());
    let address = format!("127.0.0.1:{}", port);

    // Create DB connection pool
    let pool: PgPool = db::connection::create_pool()
        .await
        .expect("Failed to connect to database");

    println!("Database connected successfully");

    let app = Router::new()
        .route("/", get(root))
        .with_state(pool);

    let listener = TcpListener::bind(&address)
        .await
        .unwrap();

    println!("Server running on http://{}", address);

    axum::serve(listener, app)
        .await
        .unwrap();
}