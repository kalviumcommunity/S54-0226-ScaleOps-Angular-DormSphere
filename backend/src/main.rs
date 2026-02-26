use axum::{routing::get, Router};
use tokio::net::TcpListener;

async fn root() -> &'static str {
    "Hostel Management API Running"
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(root));

    let listener = TcpListener::bind("127.0.0.1:8000")
        .await
        .unwrap();

    println!("Server running on http://127.0.0.1:8000");

    axum::serve(listener, app)
        .await
        .unwrap();
}