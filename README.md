# QueueLess — Smart Queue Management System

> Wait anywhere, not in line. A real-time digital queue management system.

🌐 **Live Demo** → [queue-less-git-main-nithiyan2306-2395s-projects.vercel.app](https://queue-less-git-main-nithiyan2306-2395s-projects.vercel.app)

💻 **GitHub** → [github.com/Anandhanithiyan/QueueLess](https://github.com/Anandhanithiyan/QueueLess)

---

## What is QueueLess?

QueueLess eliminates physical waiting lines for service counters — clinics, banks, salons, government offices. Customers join via browser, get a real-time digital token, and are told exactly when to return. Staff manage everything from a live admin dashboard.

---

## Features

**Customer Side**
- Instant digital token — no app download required
- Live countdown timer ticking to the second
- Smart Return system — tells you when it's safe to leave and when to come back (4-minute buffer included)
- Audio chime when your turn arrives
- Queue progress bar showing position

**Admin / Staff Side**
- Live business dashboard with WebSocket sync
- Call Next, Skip, and Remove token controls
- Open / Close queue toggle
- Adjustable average service time
- Analytics — daily throughput chart and weekly stats

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v7 |
| Backend | FastAPI (Python), Uvicorn |
| Real-time | Native WebSocket (FastAPI) |
| Icons | Lucide React |
| Deployment | Render |

---

## Getting Started

**Requirements:** Node.js 18+, Python 3.10+

```bash
git clone https://github.com/Anandhanithiyan/QueueLess.git
cd QueueLess
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Environment Variable** — create `frontend/.env`:
```
VITE_BACKEND_URL=your-backend.onrender.com
```
Leave empty for local development (defaults to `localhost:8000`).

---

## Admin Access

Navigate to `/admin` in the browser.

Default password: `queueless2026`

To change it, set this on your backend host:
```
QUEUELESS_ADMIN_PASSWORD=your_password
```

---

## Project Structure

```
QueueLess/
├── backend/
│   ├── main.py              # FastAPI routes + WebSocket
│   ├── queue_manager.py     # Queue logic and state
│   ├── schemas.py           # Request validation
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── CustomerView.jsx
        │   ├── BusinessDashboard.jsx
        │   ├── AdminProtectedRoute.jsx
        │   ├── SmartReturnBlock.jsx
        │   └── AudioAlert.jsx
        └── hooks/
            └── useWebSocket.js
```

---

## API Reference

**Customer**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/queue/join` | Join queue, get token |
| GET | `/api/queue/{token_id}` | Live token status |
| DELETE | `/api/queue/leave/{token_id}` | Leave the queue |

**Admin** *(requires `X-Admin-Token` header)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Get session token |
| GET | `/api/admin/state` | Full queue state |
| POST | `/api/admin/next` | Call next customer |
| POST | `/api/admin/skip/{token_id}` | Skip a token |
| DELETE | `/api/admin/remove/{token_id}` | Remove a token |
| PATCH | `/api/admin/config` | Update settings |

**WebSocket:** `ws://host/ws/queue` — broadcasts live state to all clients

---

## Author

**Anandhanithiyan** — built as a smart queue management MVP

---

## License

MIT
