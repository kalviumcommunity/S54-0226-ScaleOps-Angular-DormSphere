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
    let expected_username = std::env::var("AUTH_LOGIN_USERNAME").ok();
    let expected_password = std::env::var("AUTH_LOGIN_PASSWORD").ok();

    if let (Some(username), Some(password)) = (expected_username, expected_password) {
        if info.username == username && info.password == password {
            return (
                StatusCode::OK,
                Json(LoginSuccessResponse {
                    message: "Login successful",
                }),
            )
                .into_response();
        }
    }

    {
        (
            StatusCode::UNAUTHORIZED,
            Json(LoginErrorResponse {
                message: "Invalid credentials",
            }),
        )
            .into_response()
    }
}