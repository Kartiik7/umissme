# Pinglet / UMissMe v3

A private, real-time shared space for two friends, featuring instant messaging, presence tracking, and shared memories. Designed with a vibrant, neo-brutalist aesthetic.

## Features

- **Real-Time Messaging:** Instant chat powered by Socket.IO with optimistic UI updates.
- **Presence & Last Seen:** See when your partner is online or when they were last active.
- **Read Receipts:** Track message delivery and read status in real-time.
- **Typing Indicators:** Real-time feedback when your partner is typing.
- **Pings & Activity Timeline:** Send quick "Pings" to grab attention and track them in the activity timeline.
- **Sanctuary Space:** A dedicated area for shared memories and meaningful moments.
- **Secure & Private:** Each space is isolated, requiring a unique Space ID and Access Code.
- **Cross-Device Sessions:** Graceful handling of multiple sessions and automatic kicks on concurrent device logins.

## Tech Stack

### Client (Frontend)
- **Framework:** React 19 + Vite
- **Styling:** TailwindCSS v4 with a custom Neo-Brutalist design language
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Real-Time:** Socket.IO Client

### Server (Backend)
- **Runtime:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **Real-Time:** Socket.IO + Redis Adapter (for scalable pub/sub)
- **Authentication:** JWT & bcrypt
- **Caching & Presence:** Redis (ioredis)

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas)
- Redis instance (local or Upstash)

## Getting Started

### 1. Clone the repository

\`\`\`bash
git clone <repository-url>
cd v3
\`\`\`

### 2. Environment Variables

#### Server
Create a `.env` file in the `server` directory:
\`\`\`env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_jwt_secret
\`\`\`

#### Client
Create a `.env` file in the `client` directory:
\`\`\`env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
\`\`\`

### 3. Installation & Running

#### Start the Backend Server

\`\`\`bash
cd server
npm install
npm run dev
\`\`\`

The server will start on `http://localhost:5000`.

#### Start the Frontend Client

In a new terminal:
\`\`\`bash
cd client
npm install
npm run dev
\`\`\`

The client will start on `http://localhost:5173`.

## Deployment

The application is configured to be deployed as a single-host application (serving static files from the backend) or separately.
To build the client:
\`\`\`bash
cd client
npm run build
\`\`\`
The backend's `server.js` will automatically serve the built client files from `client/dist` if they exist.

## License

ISC
