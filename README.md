# 🌍 StudyConnect Global

A privacy-first student networking platform connecting international students worldwide.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 4 |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Real-time | Socket.IO |
| Auth | JWT |
| Email | Nodemailer |

---

## 🚀 Quick Start

### 1. MongoDB Atlas Setup
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for development)
4. Copy your connection string

### 2. Backend Setup

```bash
cd backend
# Edit .env — paste your Atlas URI and fill other values
nano .env

# Start dev server
npm run dev
```

**`.env` fields to fill:**
```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/studyconnect_global?retryWrites=true&w=majority
JWT_SECRET=some_random_secret_string
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password  # Gmail App Password (not account password)
```

### 3. Frontend Setup

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 🧩 Features

### Smart Matching
Suggestions scored by:
- Same university (+30)
- Same campus (+20)
- Same intake year (+20)
- Same city (+15)
- Same country (+10)
- Shared interests (+5 each, max 4)

### Connection Flow
1. Browse or view suggestions → Click **Connect**
2. Write an intro message + pick tags
3. Recipient gets in-app + email notification
4. Accept → chat unlocked
5. Reject or withdraw at any time

### Privacy Rules
- No contact info visible until accepted
- 10 connection requests per day limit
- Block / Report any user
- Email notifications toggleable per user

### Real-time Chat
- Socket.IO 1-to-1 messaging
- Typing indicators
- Seen/delivered status
- Online presence

---

## 📁 Project Structure

```
France_2026/
├── backend/
│   ├── server.js
│   ├── .env                  ← fill this
│   └── src/
│       ├── models/           User, Request, Connection, Message
│       ├── routes/           auth, users (+ suggestions), requests, messages
│       ├── middleware/        auth (JWT)
│       ├── socket/           socketHandler (real-time chat)
│       └── utils/            email (Nodemailer)
└── frontend/
    └── src/
        ├── pages/            Login, Signup, Discover, Requests, Chat, Profile
        ├── components/       Navbar, ConnectModal
        ├── context/          AuthContext
        └── lib/              api (Axios), socket (Socket.IO)
```

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Generate a password for "Mail"
4. Set `EMAIL_USER` and `EMAIL_PASS` in `.env`

Without email config the app still works fully — email is silently skipped.
