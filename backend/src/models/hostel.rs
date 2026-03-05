use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Hostel {
    pub id: i32,
    pub name: String,
    pub location: Option<String>,
    pub total_capacity: Option<i32>,
}