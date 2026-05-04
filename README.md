# 💬 BlinkChat — Real-Time Chat Application

A full-stack **real-time chat application** built using the MERN stack with WebSockets, Redis caching, and modern UI/UX features.

---

## 🌐 Live Demo

🔗 https://blinkchat1-8abd.onrender.com/

---

## 📌 Features

- 🔴 Real-time messaging using Socket.IO  
- ✍️ Typing indicators  
- ✅ Message seen status (single & double tick)  
- 🔔 Unread message counts  
- ❤️ Message reactions (🔥 ❤️ 👍)  
- 🖼️ Image sharing (Cloudinary)  
- ⚡ Optimistic UI updates (instant message send)  
- 📜 Infinite scroll (pagination)  
- 👤 User authentication (JWT + cookies)  
- 🟢 Online/offline status  
- 🔐 Secure routes with middleware  
- 🚀 Redis caching for fast data access  

---

## 🏗️ Tech Stack

### Frontend
- React.js (Vite)
- Zustand (state management)
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- Redis (Upstash)

### Deployment
- Frontend → Vercel  
- Backend → Render  
- Database → MongoDB Atlas  
- Redis → Upstash  

---

## ⚙️ Architecture Overview

- WebSockets handle real-time communication  
- REST APIs for message persistence  
- Redis used for caching frequently accessed data  
- MongoDB stores users, messages, and conversations  
- Optimized queries using indexing + pagination  

---

## 📊 Performance & Optimization

- ⚡ Reduced API latency using Redis caching  
- 📌 Indexed queries for fast message retrieval  
- 📜 Pagination for handling large chat history  
- ⚡ Optimistic UI for instant user experience  
- 🔄 Socket-based updates reduce unnecessary API calls  

---

## 🧠 Key Learnings

- Building real-time systems using Socket.IO  
- Managing global state using Zustand  
- Designing scalable chat architecture  
- Implementing Redis caching for performance  
- Handling race conditions in real-time apps  

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/arka562/blinkchat.git
cd blinkchat
