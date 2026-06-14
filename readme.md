# 🖼️ VisionVault

<div align="center">

**AI-Powered Photo Management Platform**

*Organize, search, and rediscover your memories — intelligently.*

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API Docs](#-api-reference) • [Deployment](#-deployment)

</div>

---

## 📖 Overview

VisionVault is a self-hosted, AI-powered photo management platform that connects to **Google Photos** and **local storage** to bring intelligence to your entire photo library. It automatically detects duplicates, categorizes photos, recognizes faces, extracts text from documents, and lets you search your library using plain English.

Built to scale to **100,000+ images** with asynchronous processing queues, vector search, and a modern React frontend.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **Google Photos Sync** | Connect your Google Photos account and sync your entire library |
| 🗂️ **Smart Categorization** | AI automatically sorts photos into People, Travel, Food, Documents, Pets, Nature, and more |
| 🔍 **NLP Search** | Search using natural language — *"photos from Goa trip 2023"* or *"receipts from last month"* |
| 👤 **Face Recognition** | Automatically groups photos by individual faces across your library |
| 📄 **Document Detection** | Identifies Aadhaar, PAN, invoices, prescriptions, certificates, and more |
| 🔁 **Duplicate Detection** | Finds exact and near-duplicate images using perceptual hashing |
| 📅 **Event Grouping** | Clusters photos into life events based on time, location, and visual similarity |
| 🧠 **OCR** | Extracts text from images for full-text search inside photos |
| 🗺️ **Travel Memories** | Visualizes your travel history with location-based event grouping |
| ⚡ **Scalable** | Handles 100,000+ images via Redis queues and async background workers |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)               │
│         TypeScript · TailwindCSS · TanStack Query            │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                     Backend (Node.js + Express)              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth Module  │  │ Images Module│  │  Search Module   │  │
│  │  JWT + BCrypt│  │  Upload/CRUD │  │  Hybrid NLP      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Events Module │  │Memories Module│  │  Faces Module   │  │
│  │ Clustering   │  │  Highlights  │  │  Recognition     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────┬──────────────────────┬──────────────────────┬────────┘
       │                      │                      │
┌──────▼──────┐    ┌──────────▼──────┐   ┌──────────▼──────┐
│  PostgreSQL  │    │  Redis + BullMQ │   │     Qdrant      │
│  (Prisma ORM)│    │  Job Queues     │   │  Vector Search  │
└─────────────┘    └─────────────────┘   └─────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │      AI Workers            │
              │  CLIP · OCR · Face · HASH  │
              └───────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │        Cloudinary          │
              │   Image Storage & CDN      │
              └───────────────────────────┘
```

### Tech Stack

**Backend**
- **Runtime:** Node.js 18+ (ESM)
- **Framework:** Express.js
- **ORM:** Prisma with PostgreSQL
- **Queue:** BullMQ + Redis
- **Vector DB:** Qdrant (semantic search)
- **AI/ML:** CLIP (image embeddings), Tesseract (OCR), face-api.js (face detection)
- **Storage:** Cloudinary

**Frontend**
- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State:** TanStack Query + Zustand

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- A [Cloudinary](https://cloudinary.com) account (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project with Photos API enabled (optional)

### 1. Clone the Repository

```bash
git clone https://github.com/adityasingh210/VisionVault.git
cd visionvault
```

### 2. Environment Setup

**Backend** — create `Backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/visionvault"

# Auth
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Qdrant
QDRANT_URL="http://localhost:6333"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# App
PORT=3000
NODE_ENV=development
MODEL_CACHE_DIR="./.model-cache"
```

**Frontend** — create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Start with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, Qdrant)
docker-compose up -d

# Install dependencies
cd Backend && npm install
cd ../Frontend && npm install

# Run database migrations
cd ../Backend && npx prisma migrate deploy

# Start backend
npm run dev

# Start frontend (new terminal)
cd ../Frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Manual Setup (Without Docker)

Make sure PostgreSQL, Redis, and Qdrant are running locally, then:

```bash
# Backend
cd Backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev

# Frontend
cd Frontend
npm install
npm run dev
```

---

## 🐳 Deployment

### Docker Compose (Full Stack)

```bash
docker-compose up --build
```

The `docker-compose.yml` spins up:
- `visionvault-backend` on port 3000
- `visionvault-frontend` on port 5173
- `postgres` on port 5432
- `redis` on port 6379
- `qdrant` on port 6333

### Environment Variables for Production

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | ✅ |
| `REDIS_URL` | Redis connection URL | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `QDRANT_URL` | Qdrant vector DB URL | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ⬜ Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | ⬜ Optional |

---

## 📡 API Reference

### Authentication

```http
POST   /api/auth/register       # Create account
POST   /api/auth/login          # Login, get JWT
POST   /api/auth/refresh        # Refresh access token
POST   /api/auth/logout         # Logout
GET    /api/auth/me             # Get current user
```

### Images

```http
GET    /api/images              # List all images (paginated)
POST   /api/images/upload       # Upload single image
POST   /api/images/upload/batch # Upload multiple images
GET    /api/images/:id          # Get image by ID
DELETE /api/images/:id          # Delete image
```

### Search

```http
GET    /api/search?q=<query>    # NLP hybrid search
```

**Example queries:**
- `sunset beach goa`
- `aadhaar pan card document`
- `birthday party with family 2023`
- `food dinner restaurant`

### Categories

```http
GET    /api/categories                  # List all categories with counts
GET    /api/categories/:slug/images     # Images in a category
```

**Available category slugs:** `people`, `documents`, `food`, `travel`, `pets`, `nature`, `screenshots`, `vehicles`, `buildings`, `other`

### Faces

```http
GET    /api/faces/clusters              # All face clusters (people)
GET    /api/faces/clusters/:id          # Cluster detail + images
PATCH  /api/faces/clusters/:id          # Label a person
```

### Events

```http
GET    /api/events                      # List all detected events
GET    /api/events/:id                  # Event detail
GET    /api/events/:id/images           # Images in an event
POST   /api/events/rebuild              # Trigger event re-clustering
```

### Memories

```http
GET    /api/memories/highlights         # Dashboard highlights
GET    /api/memories/people             # Most photographed people
GET    /api/memories/events             # Top events
GET    /api/memories/documents          # Important documents
GET    /api/memories/monthly            # Photos by month
GET    /api/memories/travel             # Travel summary
```

---

## 🧠 How the AI Works

### Image Categorization
Uses **CLIP (clip-vit-base-patch32)** to generate image embeddings and compare them against category text embeddings. Softmax scoring assigns the best-fit category.

### NLP Search (Hybrid)
Combines 5 signals with weighted scoring:
| Signal | Weight | How |
|---|---|---|
| Semantic | 40% | CLIP text→image vector similarity via Qdrant |
| OCR Text | 30% | Full-text match on extracted text |
| Category | 15% | Keyword-based category filtering |
| Events | 10% | Event title keyword matching |
| Faces | 5% | Named face cluster matching |

### Event Detection
1. **Time bucketing** — groups images taken within 6 hours
2. **Location merging** — merges groups within 50km
3. **Visual similarity** — CLIP centroid cosine similarity (threshold: 0.82)
4. **Face reinforcement** — merges groups sharing 2+ common people

### Face Recognition
- Detects faces using **face-api.js**
- Generates 128-dimension face descriptors
- Clusters faces using distance-based grouping
- Assigns cover image per cluster for display

### OCR
- Uses **Tesseract.js** with English + Hindi trained models
- Extracts raw text stored for full-text search
- Classifies document type (Aadhaar, PAN, invoice, medical, etc.)

---

## 📁 Project Structure

```
visionvault/
├── Backend/
│   ├── src/
│   │   ├── ai/                 # CLIP, OCR, face, category, search services
│   │   ├── config/             # DB, Redis, Qdrant, Cloudinary config
│   │   ├── lib/                # JWT, crypto, errors, logger
│   │   ├── middleware/         # Auth, rate limiter, upload, validation
│   │   ├── modules/            # Feature modules (auth, images, events...)
│   │   └── workers/            # BullMQ queues and job processors
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── docker-compose.yml
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── api/                # Axios clients and API functions
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # React Query hooks (useApi.ts)
│   │   ├── pages/              # Route pages
│   │   ├── store/              # Zustand stores
│   │   └── types/              # TypeScript type definitions
│   └── package.json
│
└── README.md
```

---

## ⚙️ Background Jobs

VisionVault processes images asynchronously using BullMQ queues:

| Job | Description |
|---|---|
| `EMBEDDING` | Generates CLIP vector embedding, stored in Qdrant |
| `CATEGORY` | Classifies image into category using CLIP |
| `OCR` | Extracts text using Tesseract |
| `FACE` | Detects and clusters faces |
| `HASH` | Computes perceptual hash for duplicate detection |
| `CLUSTER` | Groups faces across the library |
| `EVENT` | Clusters images into life events |

Jobs run in a separate worker process and retry automatically on failure.

---

## 🔒 Security

- JWT-based authentication with short-lived access tokens (15 min) and refresh tokens (7 days)
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting on auth endpoints
- All routes protected via `authenticate` middleware
- Images scoped strictly to the authenticated user

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ · Powered by CLIP, Qdrant, and React

</div>
