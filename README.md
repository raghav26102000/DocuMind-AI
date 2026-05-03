<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=14&pause=1000&color=FF9933&center=true&vCenter=true&width=435&lines=AI-Powered+Government+Schemes+Portal;Multilingual+%7C+RAG+%7C+Smart+Document+Processing;Making+Bharat%27s+Welfare+Accessible+to+All" alt="Typing SVG" />

# 🇮🇳 Saral Seva — DocuMindAI

### _Bridging Citizens and Government Schemes through Intelligent AI_

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Containerised-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![AWS S3](https://img.shields.io/badge/AWS_S3-Storage-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

<br/>

> **Saral Seva** is an AI-powered Indian Government Schemes Help Portal that leverages RAG pipelines, multilingual LLMs, and intelligent document processing to help citizens discover, understand, and apply for the welfare schemes they deserve.

<br/>

[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [🏗 Architecture](#-architecture) · [📡 API Reference](#-api-reference) · [🤝 Contributing](#-contributing)

---

</div>

<br/>

## ✨ Features

<br/>

### 🤖 AI-Powered Chatbot
- Conversational AI built on the **smolagents** framework
- **Multilingual support** — responds in Hindi, Tamil, Telugu, Bengali, and 18+ Indian languages
- Context-aware responses with smart follow-up question suggestions
- **Automated grievance redressal** via email for unresolved complaints

### 📊 RAG Document Pipeline
- **DPR (Dense Passage Retrieval)** embeddings for accurate scheme matching
- Vector-based semantic search across the full scheme corpus
- Automatic extraction of citations and references from source documents
- Real-time scheme eligibility matching against uploaded user documents

### 🔍 Advanced Web Search
- **Brave Search API** integration for up-to-date scheme information
- Concurrent URL content extraction and full-text parsing via Playwright
- Intelligent relevance scoring and filtering pipeline

### 📄 Smart Document Management
- Multi-format support: **PDF, DOCX, Excel, and images**
- **Tesseract OCR** for text extraction from scanned documents
- AI-powered document authenticity and completeness verification
- Automatic **DPR (Document Processing Report)** generation
- Secure cloud storage via **AWS S3**

### 🔐 Authentication & Access Control
- **OTP-based authentication** — no passwords required
- JWT session management with configurable expiry
- Built-in **API rate limiting** and in-memory caching (FastAPI-cache2)

### ⚡ Async Infrastructure
- **Celery** workers with Redis broker for background processing
- Real-time **WebSocket** notifications
- **Nginx** reverse proxy with load balancing
- Multi-stage **Docker** builds for all services

<br/>

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│     Next.js 15 · React 19 · TailwindCSS · Bootstrap 5       │
│          FilePond (uploads) · React-Markdown · WebSocket     │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTP / WebSocket
                      ┌─────▼─────┐
                      │   Nginx   │  ← Reverse Proxy + Load Balancer
                      └─────┬─────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      SERVICE LAYER                           │
│          FastAPI · Celery Workers · WebSocket Server         │
│                   JWT Auth · OTP Verification                │
└──────┬────────────────────┬─────────────────────────────────-┘
       │                    │
┌──────▼──────┐    ┌────────▼────────────────────────────────┐
│  DATA LAYER │    │              AI / ML LAYER               │
│  MongoDB    │    │  smolagents · LiteLLM · OpenAI · Gemini  │
│  Redis      │    │  Hugging Face DPR · Brave Search         │
│  AWS S3     │    │  Tesseract OCR · PyMuPDF · Playwright    │
└─────────────┘    └─────────────────────────────────────────-┘
```

<br/>

---

## 🧠 AI Pipeline — How It Works

```
 Citizen Query / Document Upload
           │
           ▼
 ┌─────────────────────┐
 │  Multilingual NLP   │  ← Detects language, normalises input
 │  Intent Detection   │  ← smolagents classifies query type
 └─────────┬───────────┘
           │
           ▼
 ┌─────────────────────┐
 │  Document Pipeline  │  ← Tesseract OCR + PyMuPDF extraction
 │  (if file uploaded) │  ← AI categorises by scheme relevance
 └─────────┬───────────┘
           │
           ▼
 ┌─────────────────────┐
 │   RAG Retrieval     │  ← DPR embeddings → Vector search
 │   + Brave Search    │  ← Live web context fetched & ranked
 └─────────┬───────────┘
           │
           ▼
 ┌─────────────────────┐
 │   LLM Generation    │  ← GPT-4o / Gemini via LiteLLM
 │   (Grounded)        │  ← Eligibility check against documents
 └─────────┬───────────┘
           │
           ▼
 ┌─────────────────────┐
 │  DPR + Guidance     │  ← Document Processing Report
 │  Delivery           │  ← Step-by-step application guide
 │                     │  ← Auto grievance email if needed
 └─────────────────────┘
```

<br/>

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | FastAPI + Python 3.11 | REST API, business logic |
| **Frontend** | Next.js 15 + React 19 | Modern, responsive UI |
| **Database** | MongoDB + Motor (async) | Scheme & user data |
| **Cache / Queue** | Redis + Celery | Sessions, background tasks |
| **AI Agents** | smolagents | Intelligent automation |
| **LLM Interface** | LiteLLM | GPT-4o, Gemini, unified API |
| **Embeddings** | Hugging Face DPR | Semantic vector search |
| **OCR** | Tesseract + PyMuPDF | Document text extraction |
| **Web Scraping** | Playwright + BeautifulSoup | Scheme data collection |
| **Search** | Brave Search API | Live web information |
| **File Storage** | AWS S3 | Secure document storage |
| **Infra** | Docker + Nginx | Containers, load balancing |
| **Styling** | TailwindCSS + Bootstrap 5 | UI components |
| **File Upload** | React FilePond | Drag-and-drop uploads |

<br/>

---

## 📦 Project Structure

```
DocuMindAI/
├── backend/                    # FastAPI backend
│   ├── main.py                 # App entrypoint
│   ├── routers/
│   │   ├── auth.py             # OTP auth endpoints
│   │   ├── chatbot.py          # AI chat endpoints
│   │   ├── schemes.py          # Scheme search & details
│   │   └── documents.py        # Document upload & verify
│   ├── agents/
│   │   ├── chatbot_agent.py    # smolagents chatbot
│   │   └── document_agent.py   # Document processing agent
│   ├── rag/
│   │   ├── embeddings.py       # DPR embedding pipeline
│   │   └── retriever.py        # Vector search
│   ├── tasks.py                # Celery async tasks
│   └── requirements.txt
│
├── saral-sewa/                 # Next.js frontend
│   ├── app/                    # App Router pages
│   ├── components/             # Reusable UI components
│   └── package.json
│
├── pipeline/                   # Data ingestion pipeline
│   ├── main.py                 # Scheme scraping + indexing
│   └── requirements.txt
│
├── docker-compose.yaml         # All services orchestration
├── nginx.conf                  # Reverse proxy config
└── .env.example                # Environment variable template
```

<br/>

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- OpenAI API key, Gemini API key, Brave Search API key
- Hugging Face token
- AWS S3 bucket + credentials

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/DocuMindAI.git
cd DocuMindAI
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):

```env
# Database
MONGO_URI=mongodb://localhost:27017/schemes_db

# AI / ML
HF_TOKEN=your_huggingface_token
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
BRAVE_API_KEY=your_brave_search_api_key

# Storage
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=ap-south-1

# App
SESSION_SECRET=your_session_secret
SUPPORT_EMAIL=support@saralsewa.com
SMTP_SERVER=smtp.gmail.com
```

**Frontend** (`saral-sewa/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/master
```

### 3. Build & Launch All Services

```bash
DOCKER_BUILDKIT=1 docker compose build --build-arg CACHE_BUSTER=$(date +%s)
docker compose up -d
```

### 4. Index Government Schemes

```bash
docker compose exec pipeline python main.py
```

### 5. Open the App

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ API | http://localhost:8000/api/master |
| 📖 API Docs | http://localhost:8000/docs |

---

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd saral-sewa
npm install && npm run dev
```

**Pipeline:**
```bash
cd pipeline
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python main.py
```

<br/>

---

## 📡 API Reference

All endpoints are prefixed with `/api/master` and require a JWT bearer token (except auth routes).

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/send-otp` | Send OTP to registered phone |
| `POST` | `/auth/verify-otp` | Verify OTP, receive JWT token |
| `POST` | `/auth/logout` | Invalidate current session |

### Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chatbot/chat` | Send message to AI assistant |

### Schemes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/schemes` | List all indexed schemes |
| `GET` | `/schemes/{slug}` | Get full scheme details |
| `GET` | `/schemes/search?q=` | Full-text scheme search |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents/upload` | Upload documents to S3 |
| `GET` | `/documents` | List user's documents |
| `POST` | `/documents/verify` | Verify document authenticity |

<br/>

---

## 🎯 Who Is This For?

| Citizen | Schemes They Can Discover |
|---------|--------------------------|
| 👨‍🌾 **Farmers** | PM Kisan Yojana, crop insurance, soil health card |
| 👩‍🎓 **Students** | Scholarships, skill development, fellowships |
| 🤱 **Women** | Mahila schemes, maternity benefits, SHG support |
| 🏗️ **Labour** | MGNREGS, PMAY housing, pension schemes |
| 🧓 **Senior Citizens** | Atal Pension Yojana, Ayushman Bharat |
| 🏢 **MSMEs** | Mudra loans, startup grants, credit guarantee |

<br/>

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Fork the repo, then:
git clone https://github.com/your-username/DocuMindAI.git
git checkout -b feature/your-feature-name

# Make your changes, then:
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a Pull Request
```

<br/>

---

## 🆘 Support

| Channel | Details |
|---------|---------|
| 📧 Email | support@saralsewa.com |
| 🤖 Chatbot | Available 24/7 on the platform |
| 🐛 Issues | [Open a GitHub Issue](../../issues) |

<br/>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br/>

---

<div align="center">

Made with ❤️ for Bharat 🇮🇳

**DocuMindAI — Making Government Schemes Accessible to Every Citizen**

[![GitHub stars](https://img.shields.io/github/stars/your-org/DocuMindAI?style=social)](https://github.com/your-org/DocuMindAI)
[![GitHub forks](https://img.shields.io/github/forks/your-org/DocuMindAI?style=social)](https://github.com/your-org/DocuMindAI/fork)

</div>
