# umissme

> A private space for couples to leave messages for each other.

## Project Structure

```
umissme/
├── client/                  # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── Navbar.module.css
│       └── pages/
│           ├── Home.jsx
│           ├── Home.module.css
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Auth.module.css
│           ├── Messages.jsx
│           └── Messages.module.css
│
└── server/                  # Node.js + Express backend
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── config/
    │   └── db.js
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── User.js
    │   └── Message.js
    ├── controllers/
    │   ├── authController.js
    │   └── messageController.js
    └── routes/
        ├── authRoutes.js
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
MONGO_URI=mongodb://localhost:27017/umissme
JWT_SECRET=your_long_secret_here
CLIENT_URL=http://localhost:5173
```

### 3. Run the app

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/messages` | ✓ | Get conversation with partner |
| POST | `/api/messages` | ✓ | Send a message |
| PATCH | `/api/messages/:id/read` | ✓ | Mark message as read |
| DELETE | `/api/messages/:id` | ✓ | Delete own message |
