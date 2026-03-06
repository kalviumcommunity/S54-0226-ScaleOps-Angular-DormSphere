use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Hostel {
    pub id: i32,
    pub name: String,
    pub location: Option<String>,
    pub total_capacity: Option<i32>,
}

#[derive(Deserialize)] 
pub struct CreateHostel {
    pub name: String,
    pub location: Option<String>,
    pub total_capacity: Option<i32>,
}

#[derive(serde::Deserialize)]
pub struct UpdateHostel {
    pub name: Option<String>,
    pub location: Option<Option<String>>,
    pub total_capacity: Option<Option<i32>>,
}