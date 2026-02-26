# 🏨 DormSphere

DormSphere is a scalable hostel management platform built using **Angular (Frontend)** and **Rust (Backend)** with **PostgreSQL** as the database.

The platform manages:

* Room allocation
* Maintenance requests
* Fee tracking
* Visitor logs
* Occupancy analytics

---

## 🛠 Tech Stack

* **Frontend:** Angular
* **Backend:** Rust (Axum)
* **Database:** PostgreSQL
* **Containerization:** Docker
* **Authentication:** JWT (Planned)

---

# 🚀 How to Run DormSphere Locally

Follow these steps carefully.

---

## 1️⃣ Prerequisites

Make sure you have installed:

* Node.js (LTS version)
* Angular CLI
* Rust
* Docker Desktop
* Git

Check installation:

```bash
node -v
npm -v
ng version
rustc --version
cargo --version
docker --version
```

---

## 2️⃣ Clone the Repository

```bash
git clone https://github.com/kalviumcommunity/S54-0226-ScaleOps-Angular-DormSphere.git
```

---

## 3️⃣ Start PostgreSQL (Docker)

From the root folder:

```bash
docker-compose up -d
```

This will start the PostgreSQL database on:

```
localhost:5432
```

---

## 4️⃣ Start the Backend (Rust)

```bash
cd backend
cargo run
```

Backend will run on:

```
http://localhost:8000
```

You should see:

```
Hostel Management API Running
```

---

## 5️⃣ Start the Frontend (Angular)

Open a new terminal:

```bash
cd frontend
ng serve
```

Frontend will run on:

```
http://localhost:4200
```

---

# 🏗 Project Structure

```
├── dormsphere/        # Angular application
├── backend/         # Rust API server
├── docker-compose.yml
├── README.md
```

---

# 📅 Sprint Plan

* Week 1 – Setup & Architecture
* Week 2 – Core Features
* Week 3 – Integration & Testing
* Week 4 – Deployment & Demo



# 👨‍💻 Team Members

* Sravan Teja Reddy
* Mohammed Yaseen Varamangalath
* Mohan Kumar