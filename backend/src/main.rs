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

    let port: u16 = match env::var("PORT") {
        Ok(port_string) => port_string.parse::<u16>().unwrap_or_else(|err| {
            panic!("PORT value '{}' is not a valid port number: {}", port_string, err)
        }),
        Err(env::VarError::NotPresent) => 8000,
        Err(env::VarError::NotUnicode(_)) => panic!("PORT must be a valid UTF-8 string"),
    };
    let address = format!("127.0.0.1:{}", port);

    // Create DB connection pool
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set before starting the server");

    let pool: PgPool = db::connection::create_pool(&database_url)
        .await
        .expect("Failed to connect to database");

    println!("Database connected successfully");

    let app = Router::new()
        .route("/", get(root))
        .with_state(pool);

    let listener = TcpListener::bind(&address)
        .await
        .unwrap_or_else(|err| panic!("Failed to bind to {}: {err}", address));

    println!("Server running on http://{}", address);

    axum::serve(listener, app)
        .await
        .unwrap();
}