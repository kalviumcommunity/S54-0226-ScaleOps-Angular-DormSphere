use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct MaintenanceRequest {
    pub id: i32,
    pub room_id: Option<i32>,
    pub room_number: Option<String>,
    pub hostel_id: Option<i32>,
    pub hostel_name: Option<String>,
    pub description: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct CreateMaintenanceRequest {
    pub room_id: Option<i32>,
    pub description: String,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateMaintenanceRequest {
    pub room_id: Option<Option<i32>>,
    pub description: Option<String>,
    pub status: Option<String>,
}
