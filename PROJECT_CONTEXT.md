# Federated Healthcare AI Platform — Project Context

## Overview

Enterprise-style AI healthcare analytics platform using:

* Federated Learning concepts
* FT-Transformer deep learning model
* SHAP explainability
* FastAPI backend
* Next.js frontend
* PostgreSQL database
* Docker deployment architecture

The project predicts cardiovascular disease risk using tabular healthcare data and provides explainability, fairness monitoring, federated monitoring, and enterprise analytics dashboards.

---

# Current Architecture

Frontend:

* Next.js + TypeScript + Tailwind CSS
* Recharts dashboards
* Enterprise healthcare UI

Backend:

* FastAPI
* JWT authentication
* SQLAlchemy ORM
* PostgreSQL
* SHAP explainability APIs

ML:

* FTTransformer model (PyTorch)
* SHAP explainability
* Cardiovascular risk prediction

Infrastructure:

* Docker + docker-compose
* Environment variable configuration
* Production-grade .gitignore

---

# Completed Features

## Prediction System

* Live risk prediction API
* PostgreSQL prediction logging
* Risk categories
* Audit trail

## Explainability

* SHAP backend integration
* Live explainability dashboard
* Feature importance
* Top contributing features

## Dashboard Analytics

* Live PostgreSQL analytics
* Dynamic dashboard metrics
* Risk distribution
* Prediction trends
* Recent activity feed

## Fairness Dashboard

* Backend fairness APIs
* Demographic parity metrics
* Bias/fairness monitoring
* Subgroup analytics

## Federated Dashboard

* Backend federated monitoring APIs
* Client activity telemetry
* Round monitoring
* Synchronization analytics
* Aggregation metrics

## Authentication

* JWT backend authentication
* Token-protected APIs
* Frontend token integration

## Deployment & DevOps

* Dockerized architecture
* PostgreSQL migration completed
* Environment variable support (.env)
* Production-style .gitignore

---

# Important Files

Backend:

* backend/api/app.py
* backend/database/database.py
* backend/config.py
* backend/explainability/shap_explainer.py

Frontend:

* frontend/app/dashboard/page.tsx
* frontend/app/fairness/page.tsx
* frontend/app/federated/page.tsx
* frontend/app/explainability/page.tsx

Infrastructure:

* docker-compose.yml
* .env
* .env.example

---

# Current Status

The platform now uses:

* PostgreSQL instead of SQLite
* Live backend APIs instead of mock dashboard data
* Real dashboard analytics
* Real SHAP explainability
* Real audit logging

Most major dashboards are connected to live APIs.

---

# Remaining Improvements

## Authentication UX

Still needed:

* frontend login page
* automatic login flow
* logout system
* auth guards
* session persistence

## UI/UX

Need cleaner:

* prediction form UX
* mobile responsiveness
* dashboard polish

## Advanced ML / Research

Potential future upgrades:

* real federated multi-client training
* differential privacy
* secure aggregation
* anomaly detection
* multi-disease prediction
* streaming telemetry

---

# Environment Variables

Uses:

* DATABASE_URL
* JWT_SECRET_KEY
* NEXT_PUBLIC_API_URL
* CORS_ORIGINS

Stored in:

* .env

---

# Startup Commands

Backend:
uvicorn app:app --reload

Frontend:
npm run dev

Docker:
docker compose up --build

---

# Notes

Current project is production-style SaaS architecture but still partially research/demo level for:

* true distributed federated learning
* advanced privacy-preserving FL
* real-time streaming telemetry
* medical-grade validation

Core backend/frontend integration is functional and enterprise-style.
