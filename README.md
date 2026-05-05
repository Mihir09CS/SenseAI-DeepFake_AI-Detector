🛡️ TrustLensAI

Multi-Modal Deepfake Threat Intelligence Platform


📌 Overview

TrustLensAI is a full-stack deepfake detection and threat intelligence platform designed to analyze and verify the authenticity of digital media across image, audio, and video modalities.

Unlike traditional systems that return binary results (real/fake), TrustLensAI provides:

Quantified threat scoring

Structured risk categorization

Persistent forensic logging

Bulk moderation workflows

Role-based analytics dashboards

Real-time system health monitoring


This project demonstrates how AI inference can be integrated into a scalable, secure, and production-oriented architecture.


---

🚀 Key Features

🔐 Authentication & Security

JWT-based authentication

Google OAuth integration

Role-based access control (User / Admin)

Protected API endpoints



---

🔍 Multi-Modal Detection

Image deepfake detection (CNN-based model)

Audio deepfake detection (MFCC + RandomForest)

Video deepfake detection (frame-based inference)

Supports:

URL-based scanning

File upload scanning




---

🧠 Threat Intelligence Layer

Converts AI probability → Threat Score (0–100)

Risk categorization:

High

Medium

Low


Explanation layer for interpretability



---

📦 Bulk Analyzer

Scan multiple media URLs simultaneously

Aggregate risk results

Designed for moderation workflows



---

🗄️ Forensic Logging

Persistent scan storage

User-specific scan history

Timestamped and auditable records



---

📊 Analytics Dashboard

Total scans

Risk distribution

Media-type breakdown

Average threat score

Detection rate



---

👑 Admin Dashboard

Platform-level statistics

Risk distribution across media types

User and scan monitoring



---

❤️ System Health Monitoring

Backend status

Database connectivity

AI service availability

Model readiness (audio/image/video)



---

💬 AI Assistant

FAQ-based assistant for:

Deepfake understanding

Risk interpretation

System usage guidance




---

🏗️ Architecture

Frontend (React + Vite + Tailwind)
        ↓
Backend API (Node.js + Express)
        ↓
MongoDB (Database)
        ↓
AI Microservice (FastAPI)
        ↓
Models:
  - Audio (.pkl)
  - Image (.h5)
  - Video (.pt)


---

⚙️ Tech Stack

Frontend

React (Vite)

Tailwind CSS

Axios


Backend

Node.js

Express.js

MongoDB (Mongoose)

JWT Authentication


AI Service

FastAPI

scikit-learn

TensorFlow / Keras

PyTorch

librosa

OpenCV



---

📡 API Endpoints

🔐 Auth

POST /api/auth/register

POST /api/auth/login

POST /api/auth/google

GET /api/auth/me



---

🔍 Scan

POST /api/scan → Single URL scan

POST /api/scan/file → File upload scan

POST /api/scan/bulk → Bulk scan

GET /api/scan/history → Scan history

GET /api/scan/summary → User analytics



---

👑 Admin

POST /api/admin/login

GET /api/admin/stats

GET /api/admin/distribution



---

⚙️ Utility

GET /health → System health

POST /api/chat → AI assistant



---

📊 Data Models

User

{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "user | admin",
  "authProvider": "local | google"
}

Scan

{
  "userId": "ObjectId",
  "mediaUrl": "string",
  "mediaType": "image | audio | video",
  "probability": "number",
  "riskLevel": "High | Medium | Low",
  "threatScore": "number",
  "explanation": "string",
  "timestamp": "date",
  "aiVersion": "string"
}


---

🧪 Local Setup

1. Clone Repository

git clone https://github.com/your-username/trustlens-ai.git
cd trustlens-ai


---

2. Backend Setup

cd backend
npm install
npm run dev


---

3. AI Service Setup

cd ai_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000


---

4. Frontend Setup

cd frontend
npm install
npm run dev


---

🔐 Environment Variables

Backend (.env)

MONGO_URI=
JWT_SECRET=
AI_SERVICE_URL=
GOOGLE_CLIENT_ID=
FRONTEND_URL=


---

AI Service (.env)

AUDIO_MODEL_PATH=
IMAGE_MODEL_PATH=
VIDEO_MODEL_PATH=
VIDEO_FRAME_INTERVAL=5
VIDEO_MAX_FRAMES=24


---

⚠️ Limitations

Video model performance requires further optimization

No formal benchmarking metrics included

No real-time streaming detection

Limited explainability visualization



---

🚧 Future Improvements

Advanced video deepfake detection (temporal modeling)

Model benchmarking dashboard

Explainable AI (Grad-CAM, spectrogram visualization)

Cloud deployment (scalable inference)

Browser extension integration

Real-time detection pipeline



---

🎯 Use Cases

Social media moderation

News verification

Digital content authenticity validation

Cybersecurity threat analysis

Educational tools for AI awareness



---

🏁 Conclusion

TrustLensAI goes beyond simple deepfake detection by integrating AI inference into a complete operational system with:

Security

Analytics

Observability

Moderation workflows


It demonstrates how AI systems can be built for real-world deployment, not just model-level experimentation.


