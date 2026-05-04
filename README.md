<div align="center">

```
██████╗ ██╗     ██╗███╗   ██╗██╗  ██╗ ██████╗██╗  ██╗ █████╗ ████████╗
██╔══██╗██║     ██║████╗  ██║██║ ██╔╝██╔════╝██║  ██║██╔══██╗╚══██╔══╝
██████╔╝██║     ██║██╔██╗ ██║█████╔╝ ██║     ███████║███████║   ██║   
██╔══██╗██║     ██║██║╚██╗██║██╔═██╗ ██║     ██╔══██║██╔══██║   ██║   
██████╔╝███████╗██║██║ ╚████║██║  ██╗╚██████╗██║  ██║██║  ██║   ██║   
╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
```

### Real-time chat. Zero lag. Full stack.

[![Live Demo](https://img.shields.io/badge/🔴%20LIVE%20DEMO-Visit%20App-red?style=for-the-badge)](https://blinkchat1-8abd.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-arka562-black?style=for-the-badge&logo=github)](https://github.com/arka562)
[![Made with](https://img.shields.io/badge/Made%20with-MERN%20Stack-00D4AA?style=for-the-badge)](https://github.com/arka562/blinkchat)

</div>

---

## What is BlinkChat?

BlinkChat is a **full-stack real-time chat application** built from scratch using the MERN stack. It handles everything you'd expect from a modern chat app — live messaging, typing indicators, read receipts, reactions, image sharing — backed by WebSockets, Redis caching, and a scalable architecture.

> Built as a deep-dive into real-time systems, state management, and backend performance optimization.

---

## Features at a Glance

| Feature | Details |
|---|---|
| ⚡ Real-time messaging | Powered by Socket.IO — no polling, no delay |
| ✍️ Typing indicators | Live "user is typing..." feedback |
| ✅ Read receipts | Single tick (sent) → Double tick (seen) |
| 🔔 Unread counts | Per-conversation badge counts |
| ❤️ Reactions | React to messages with 🔥 ❤️ 👍 |
| 🖼️ Image sharing | Upload & share via Cloudinary |
| ⚡ Optimistic UI | Messages appear instantly before server confirms |
| 📜 Infinite scroll | Paginated chat history — loads as you scroll |
| 🔐 Authentication | JWT-based auth stored in secure HTTP-only cookies |
| 🟢 Online/Offline | Real-time presence detection |
| 🚀 Redis caching | Fast reads on frequently accessed data |

---

## Tech Stack

### Frontend
```
React.js (Vite)    →  Component-based UI
Zustand            →  Lightweight global state management
Tailwind CSS       →  Utility-first styling
Axios              →  HTTP client for REST calls
```

### Backend
```
Node.js + Express  →  REST API server
MongoDB (Mongoose) →  Persistent storage for users, messages, conversations
Socket.IO          →  WebSocket layer for real-time events
Redis (Upstash)    →  Caching layer for low-latency data access
```

### Infrastructure
```
Frontend   →  Vercel
Backend    →  Render
Database   →  MongoDB Atlas
Cache      →  Upstash Redis
Media      →  Cloudinary
```

---

## Architecture Overview

```
Client (React + Zustand)
        │
        ├── REST API (Express) ──── MongoDB Atlas
        │       └── JWT Auth middleware
        │
        └── WebSocket (Socket.IO) ── Redis (Upstash)
                └── Real-time events: messages, typing, presence, reactions
```

**How the layers interact:**
- **REST API** handles auth, initial data loads, and message persistence
- **WebSocket** pushes real-time events (new messages, typing, seen status) without polling
- **Redis** caches conversation lists, unread counts, and online status to reduce DB hits
- **MongoDB** is the source of truth for all persisted data with indexed queries for performance

---

## Performance Decisions

### Why Redis?
Frequently read data — like unread counts and online status — doesn't need a DB round-trip every time. Redis cuts that latency significantly.

### Why Optimistic UI?
Messages render instantly on the sender's side before the server confirms. The UI rolls back silently on failure. This is what makes the app *feel* fast.

### Why pagination?
Loading 10,000 messages on open is a non-starter. Infinite scroll fetches pages on demand, keeping initial load fast and memory usage low.

### Indexed MongoDB queries
Message retrieval queries are backed by indexes on `conversationId` and `createdAt` so sort + filter operations don't do full collection scans.

---

## Key Engineering Challenges

**Race conditions in real-time apps**
When two users send messages simultaneously, event ordering matters. Handled through server-side timestamps and client-side queue management.

**Seen status accuracy**
Single vs double tick requires tracking when *each participant* has actually viewed a message — not just received it. Implemented via Socket.IO acknowledgements tied to viewport visibility.

**State sync between REST and WebSocket**
REST fetches initial state; WebSocket patches it live. Zustand manages this merge cleanly without re-fetching entire conversations on every event.

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB instance (local or Atlas)
- Redis instance (local or Upstash)
- Cloudinary account

### 1. Clone
```bash
git clone https://github.com/arka562/blinkchat.git
cd blinkchat
```

### 2. Backend
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
REDIS_URL=your_upstash_redis_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## Project Structure

```
blinkchat/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── store/           # Zustand stores
│   │   ├── hooks/           # Custom React hooks
│   │   └── pages/           # Route-level pages
│
├── server/                  # Express backend
│   ├── controllers/         # Route handlers
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route definitions
│   ├── middleware/          # Auth + error middleware
│   ├── socket/              # Socket.IO event handlers
│   └── utils/               # Redis client, helpers
```

---

## What I Learned Building This

- How WebSocket connections are managed at scale and where they break
- Why optimistic UI is non-trivial — rollback logic is harder than the happy path
- Redis isn't magic — wrong cache invalidation creates bugs worse than no cache
- Zustand's simplicity over Redux is worth it for mid-sized apps
- Real-time features expose race conditions that REST APIs hide entirely

---

<div align="center">

**Built by [Arkaprava Ghosh](https://github.com/arka562)**

*Feedback, issues, and PRs are welcome.*

</div>
