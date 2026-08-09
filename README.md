[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-teal?style=for-the-badge)](https://YOUR_LIVE_URL_HERE)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://YOUR_GITHUB_URL_HERE)

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
# Clone
git clone https://github.com/YOUR_USERNAME/queueless.git
cd queueless
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
Leave it empty for local development (defaults to `localhost:8000`).

---

## Admin Access

Go to `/admin` in the browser.

Default password: `queueless2026`

To change it, set this on your backend host:
```
QUEUELESS_ADMIN_PASSWORD=your_password
```

---

## Project Structure

```
queueless/
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

**Admin** *(send `X-Admin-Token` header)*

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
