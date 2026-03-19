use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Room {
    pub id: i32,
    pub hostel_id: i32,
    pub room_number: String,
    pub capacity: i32,
    pub occupied_beds: i64,
}

#[derive(Deserialize)]
pub struct CreateRoom {
    pub hostel_id: i32,
    pub room_number: String,
    pub capacity: i32,
}

#[derive(Deserialize)]
pub struct UpdateRoom {
    pub hostel_id: Option<i32>,
    pub room_number: Option<String>,
    pub capacity: Option<i32>,
}
