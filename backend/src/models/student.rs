use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Student {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department: Option<String>,
    pub status: String,
    pub avatar_url: Option<String>,
    pub room_id: Option<i32>,
    pub room_number: Option<String>,
    pub hostel_id: Option<i32>,
    pub hostel_name: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateStudent {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub avatar_url: Option<String>,
    pub room_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct UpdateStudent {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<Option<String>>,
    pub department: Option<Option<String>>,
    pub status: Option<String>,
    pub avatar_url: Option<Option<String>>,
    pub room_id: Option<Option<i32>>,
}
