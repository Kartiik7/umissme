# Pinglet

A private shared space for two friends to chat, ping each other, save memories, and track activity in one place.

## Features

- Create or join a private friend space with an access code
- Choose your identity before entering messages
- Real-time style chat with read receipts
- Quick ping action for lightweight check-ins
- Shared memory board with title, note, and optional image URL
- Activity timeline with message, memory, ping, and system events
- New activity badges based on your last seen timestamp

## Project Structure

```text
pinglet/
├── client/                  # React + Vite frontend
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Logo.jsx
│       │   └── Navbar.jsx
│       ├── pages/
│       │   ├── HomePage.jsx
│       │   ├── CreateSpacePage.jsx
│       │   ├── JoinSpacePage.jsx
│       │   ├── PartnerSelectPage.jsx
│       │   ├── MessagesPage.jsx
│       │   └── DashboardPage.jsx
│       ├── services/
│       │   ├── api.js
│       │   └── session.js
│       └── styles/
│
└── server/                  # Node.js + Express backend
    ├── server.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── spaceController.js
    │   └── messageController.js
    ├── models/
    │   ├── CoupleSpace.js
    │   ├── Message.js
    │   ├── Memory.js
    │   └── Activity.js
    └── routes/
        ├── spaceRoutes.js
        └── messageRoutes.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure environment

Copy `server/.env.example` to `server/.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pinglet
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
```

### 3. Run the app

```bash
# Terminal 1 - backend
cd server
npm run dev

# Terminal 2 - frontend
cd client
npm run dev
```

Open http://localhost:5173

## Core API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/spaces/create` | Create a friend space |
| POST | `/api/spaces/join` | Join an existing friend space |
| POST | `/api/spaces/:spaceId/identify` | Select identity in a space |
| GET | `/api/spaces/:spaceId/overview` | Fetch dashboard overview |
| POST | `/api/spaces/:spaceId/ping` | Send a ping |
| POST | `/api/spaces/:spaceId/memories` | Add a memory |
| GET | `/api/messages/:spaceId` | Fetch messages for a space |
| POST | `/api/messages/send` | Send a message |
| PATCH | `/api/messages/:spaceId/seen` | Mark incoming messages as seen |
