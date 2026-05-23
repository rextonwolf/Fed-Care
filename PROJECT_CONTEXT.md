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
* Enterprise login page (`/login`)
* Session persistence (localStorage)
* Auth guards + redirect unauthenticated users
* Logout from sidebar

## Neuro-Symbolic Knowledge Graph (Phase 2)

* Statistical relationship learning (`relationship_extractor.py`)
* Weighted NetworkX graph (`graph_builder.py`)
* Graph structural analysis (`graph_analysis.py`)
* Uncertainty / OOD engine (`uncertainty_engine.py`)
* Prediction validator vs FT-Transformer (`prediction_validator.py`)
* Visualization + artifacts (`visualization.py`, `pipeline.py`)
* `/predict` response includes `neuro_symbolic_validation` when graph is built

Build graph: `python -m backend.knowledge_graph.pipeline` from repository root

## Multi-dataset ML & harmonization

**Datasets (knowledge graph + training):**

| Source | File | Role |
|--------|------|------|
| Cardiovascular | `datasets/cardio.csv` | Primary ML cohort (70k+ rows) |
| UCI heart | `datasets/heart_disease_uci.csv` | Training + KG |
| Diabetes | `datasets/diabetes.csv` | KG relationships |
| Kidney | `datasets/kidney_disease.csv` | KG relationships |
| Symptoms | `datasets/symptom_disease.csv` | Symptom–disease edges |
| MIMIC-III demo | `datasets/mimic-iii-clinical-database-demo-1.4/` | ICU vitals/labs |
| MIMIC cohort | `datasets/mimic_cohort.csv` | Generated tabular ICU features |

**Pipeline (from `backend/`):**

```bash
python -m backend.preprocessing_unified   # 24 features, hospital_a/b/c + test.csv
python -m backend.training.train          # saves global_federated_model.pth
python -m backend.knowledge_graph.pipeline
```

* Shared vocabulary: `backend/clinical_schema.py`
* Dynamic inference: `backend/api/feature_registry.py` (feature order + median imputation)
* `/predict` accepts 11 core fields + optional UCI/ICU extensions

## Patient Memory / History (foundation)

* `Patient` PostgreSQL model + `patient_id` on prediction logs
* REST APIs: `POST/GET /patients`, `GET /patients/{id}/history`
* Optional `patient_id` on `/predict` for longitudinal tracking
* Frontend patient registry + risk trend charts
* Prepared for future PDF report ingestion pipeline

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
* frontend/app/login/page.tsx
* frontend/app/patients/page.tsx
* frontend/lib/auth.ts

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

## Report ingestion pipeline (planned)

1. ~~Patient profile/history system~~ (foundation complete)
2. Report ingestion backend
3. PDF extraction pipeline
4. Auto-fill prediction workflow
5. Historical trend analytics (partial — per-patient risk trend live)

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
uvicorn backend.api.app:app --reload

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
