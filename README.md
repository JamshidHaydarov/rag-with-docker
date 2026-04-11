# 📘 RAG AI Knowledge Base (Fullstack)
### 💬 Features
- Authentication (login/register)
- File selection
- Real-time chat (WebSocket)
- AI responses
- Loading states (connecting, sending)
### 🔌 WebSocket connection
```javaScript
const token = localStorage.getItem("token");

const ws = new WebSocket(
    ws://localhost:8080/chat?token=${token}
);

ws.onopen = () => {
    console.log("connected");
};

ws.onmessage = (event) => {
    console.log("message:", event.data);
};
```
### 📤 Send message
```javaScript
ws.send(JSON.stringify({
    file_id: 1,
    question: "What is inside this document?"
}));
```

### 🔐 Authentication (JWT)
#### Register

POST /register

```
{
"username": "john",
"password": "123456"
}
```
#### Login

POST /login
```
{
"username": "john",
"password": "123456"
}
```
#### Response:

```
{
"access_token": "JWT_TOKEN"
}
```
Store token (frontend)

```javaScript
localStorage.setItem("token", response.access_token);
```
#### Token usage

HTTP:
Authorization: Bearer <token>

WebSocket:
```
ws://localhost:8080/chat?token=<token>
```
### ⚡ Backend (FastAPI)
🚀 Run backend

```python
uvicorn main:app --reload --port 8080
```
### ⚡ WebSocket (Real-time Chat)
#### Connect
```
ws://localhost:8080/chat?token=<JWT>
```
#### On connection
```
Hello, username
```

#### Request format
```
{
  "file_id": 1,
  "question": "What is inside this document?"
}
```
#### Response

AI-generated answer based on document context

1. 🧠 RAG Pipeline
2. Receive Question
3. User sends a question via WebSocket
4. Retrieve Document
5. System finds document using file_id
6. Embedding Generation
7. model = "models/gemini-embedding-001"
8. Vector Search
9. Cosine similarity
10. Top-K relevant chunks
11. Response Generation
12. Using Google Gemini

#### Input:

- Question
- Relevant context

#### Output:

- AI-generated answer
- ⚡ Redis Caching
- Cached Data
- User files
- Embeddings
- AI responses
- Cache Key

```python
cache_key = f"user:{user_id}:files"
```
```
Strategy
Check Redis
If exists → return
If not → query DB → cache
TTL

ex = 600 (10 minutes)

Cache Invalidation

await redis_client.delete(cache_key)
```

### 🧠 Vector Store

#### Workflow:

1. Documents → chunks
2. Chunks → embeddings
3. Stored in vector DB
4. 📦 Core Functions


### 🧩 Tech Stack

#### Backend:

- FastAPI
- PostgreSQL
- SQLAlchemy (async)
- WebSocket
- Redis
- Gemini API

#### Frontend:

- React / Next.js
- WebSocket API
- Hooks

#### ⚠️ Security
- JWT authentication
- Password hashing
- Token expiration
- WebSocket auth via query params

#### 📌 Example Flow
- User registers
- User logs in → gets JWT
- Token stored in frontend
- Frontend connects via WebSocket
- User sends question

Backend:
- retrieves document
- runs RAG pipeline
- queries Gemini
- Returns real-time AI response

### 💡 Summary

This project demonstrates a modern fullstack AI system:

- Real-time communication (WebSocket)
- AI (RAG + Gemini)
- High performance (Redis)
- Interactive frontend (React)
---
### 👤 Author
Jamshid Khaydarov

Telegram: @JamshidKhaydarov
GitHub: https://github.com/JamshidHaydarov