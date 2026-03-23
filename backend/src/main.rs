use dotenv::dotenv;
use sqlx::PgPool;
use std::env;
use tokio::net::TcpListener;

mod db;
mod models;
mod routes;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .expect("PORT must be a number");

    let address = format!("0.0.0.0:{}", port);
    println!("🚀 App starting...");

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    println!("DATABASE_URL loaded");

    let pool: PgPool = match db::connection::create_pool(&database_url).await {
        Ok(pool) => {
            println!("✅ Database connected successfully");
            pool
        }
        Err(err) => {
            eprintln!("❌ Database connection failed: {:?}", err);
            std::process::exit(1);
        }
    };

    println!("Database connected successfully");

    // Create routes
    let app = routes::create_routes(pool);

    let listener = TcpListener::bind(&address).await.unwrap();

    println!("Server running on http://{}", address);

    axum::serve(listener, app)
        .await
        .expect("Failed to bind to address");
}
