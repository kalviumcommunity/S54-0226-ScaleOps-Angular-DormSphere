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
* Docker Desktop
* Git

Check installation:

```bash
node -v
npm -v
ng version
docker --version
```

---

## 2️⃣ Clone the Repository

```bash
git clone https://github.com/kalviumcommunity/S54-0226-ScaleOps-Angular-DormSphere.git
cd S54-0226-ScaleOps-Angular-DormSphere
```

---

## 3️⃣ Start Backend & Database (Docker)

From the root folder:

```bash
docker-compose up --build
```

This will: 
* Start the PostgreSQL container
* Build and start Rust backend container
* Connect backend to database automatically

```
localhost:5432
```


Backend will run on:

```
http://localhost:8000
```
Health check:

```
http://localhost:8000/health
```

## 4️⃣ Start the Frontend (Angular)

Open a new terminal:

```bash
cd dormsphere
npm install
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
├── backend/         # Rust API server (Dockerized)
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
