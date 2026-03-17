use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct LoginSuccessResponse {
    message: &'static str,
}

#[derive(Serialize)]
struct LoginErrorResponse {
    message: &'static str,
}

pub async fn login(Json(info): Json<LoginRequest>) -> impl IntoResponse {
    if info.username == "admin@university.edu" && info.password == "admin@university.edu" {
        (
            StatusCode::OK,
            Json(LoginSuccessResponse {
                message: "Login successful",
            }),
        )
            .into_response()
    } else {
        (
            StatusCode::UNAUTHORIZED,
            Json(LoginErrorResponse {
                message: "Invalid credentials",
            }),
        )
            .into_response()
    }
}