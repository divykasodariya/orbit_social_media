# Orbit - Modern Social Media Platform

Orbit is a full-stack social media web application combining rich multimedia content (video sharing) with microblogging (tweets, threads, and community discussions) and graph-based recommendation systems.

---

## 📁 Repository Structure

```
├── Orbit-frontend/          # React + Vite + TailwindCSS client application
├── Orbit-backend/           # Node.js + Express + MongoDB + Neo4j REST API
├── uml_diagrams/            # System architecture, class, and use-case diagrams
├── technical-architecture.md# In-depth architectural decisions and feature specs
├── setup-troubleshooting.md # Local environment setup and troubleshooting guide
└── .gitignore               # Root git ignore rules
```

---

## 🚀 Key Features

- **Authentication & Security:** JWT authentication with access/refresh tokens in secure HTTP-only cookies, password hashing with bcrypt.
- **Media Uploads:** Multi-part file uploads (videos, avatars, cover images) using Multer and Cloudinary CDN storage.
- **Microblogging & Threads:** Post tweets, nest replies, vote, and participate in community threads.
- **Video Sharing:** Video uploads, streaming, playlists, like/dislike, comments, and watch history.
- **Graph & Recommendations:** Graph-based social connections, mutual friend discovery, and recommendation algorithms (Neo4j & MongoDB).

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, TailwindCSS, React Router, Axios, Lucide Icons
- **Backend:** Node.js, Express.js, Mongoose (MongoDB), Neo4j driver
- **Media & Cloud:** Cloudinary SDK, Multer
- **Testing:** Jest, Supertest

---

## ⚙️ Getting Started

### 1. Backend Setup
```bash
cd Orbit-backend
npm install
# Configure your .env file (see .env.example or setup-troubleshooting.md)
npm run dev
```

### 2. Frontend Setup
```bash
cd Orbit-frontend
npm install
# Configure your .env file
npm run dev
```
