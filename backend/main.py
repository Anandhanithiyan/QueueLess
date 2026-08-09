import os
import secrets

from fastapi import (
    FastAPI,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Header,
)

from fastapi.middleware.cors import CORSMiddleware

from queue_manager import queue_manager

from schemas import (
    JoinQueueRequest,
    ConfigUpdateRequest,
    AdminLoginRequest,
)


app = FastAPI(title="QueueLess Engine")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

ADMIN_PASSWORD = os.getenv(
    "QUEUELESS_ADMIN_PASSWORD",
    "queueless2026"
)

admin_sessions = set()


def verify_admin(token: str):

    if token not in admin_sessions:

        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )


# ============================================================
# CUSTOMER APIs
# ============================================================

@app.post("/api/queue/join")
async def join_queue(payload: JoinQueueRequest):

    try:

        token_info = queue_manager.join_queue(
            payload.name,
            payload.phone
        )

        await queue_manager.broadcast_state()

        return token_info

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.get("/api/queue/{token_id}")
async def get_customer_queue(token_id: str):

    customer = queue_manager.get_customer_state(
        token_id
    )

    if not customer:

        raise HTTPException(
            status_code=404,
            detail="Token not found."
        )

    return customer


@app.delete("/api/queue/leave/{token_id}")
async def leave_queue(token_id: str):

    success = queue_manager.cancel_token(
        token_id
    )

    if not success:

        raise HTTPException(
            status_code=400,
            detail="Unable to leave this queue."
        )

    await queue_manager.broadcast_state()

    return {
        "status": "success",
        "token": token_id
    }


# ============================================================
# ADMIN LOGIN
# ============================================================

@app.post("/api/admin/login")
async def admin_login(payload: AdminLoginRequest):

    if payload.password != ADMIN_PASSWORD:

        raise HTTPException(
            status_code=401,
            detail="Invalid password."
        )

    session_token = secrets.token_urlsafe(32)

    admin_sessions.add(session_token)

    return {
        "status": "success",
        "token": session_token
    }


# ============================================================
# ADMIN APIs
# ============================================================

@app.get("/api/admin/state")
async def get_admin_state(
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    return queue_manager.get_full_state()


@app.post("/api/admin/next")
async def call_next(
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    item = queue_manager.call_next()

    await queue_manager.broadcast_state()

    return {
        "status": "success",
        "serving": item
    }


@app.post("/api/admin/skip/{token_id}")
async def skip_token(
    token_id: str,
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    success = queue_manager.skip_token(
        token_id
    )

    if not success:

        raise HTTPException(
            status_code=400,
            detail="Unable to skip this token."
        )

    await queue_manager.broadcast_state()

    return {
        "status": "success",
        "skipped": token_id
    }


@app.delete("/api/admin/remove/{token_id}")
async def remove_token(
    token_id: str,
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    success = queue_manager.remove_token(
        token_id
    )

    if not success:

        raise HTTPException(
            status_code=400,
            detail="Unable to remove this token."
        )

    await queue_manager.broadcast_state()

    return {
        "status": "success",
        "removed": token_id
    }


@app.patch("/api/admin/config")
async def update_config(
    payload: ConfigUpdateRequest,
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    if payload.avg_service_time is not None:

        queue_manager.avg_service_time = (
            payload.avg_service_time
        )

    if payload.is_open is not None:

        queue_manager.is_open = (
            payload.is_open
        )

    await queue_manager.broadcast_state()

    return {
        "status": "success",
        "is_open": queue_manager.is_open,
        "avg_service_time":
            queue_manager.avg_service_time
    }


@app.get("/api/admin/stats")
async def get_stats(
    x_admin_token: str = Header(...)
):

    verify_admin(x_admin_token)

    return queue_manager.get_stats()


# ============================================================
# WEBSOCKET
# ============================================================

@app.websocket("/ws/queue")
async def queue_websocket(
    websocket: WebSocket
):

    await queue_manager.connect(websocket)

    await websocket.send_json(
        queue_manager.get_full_state()
    )

    try:

        while True:

            await websocket.receive_text()

    except WebSocketDisconnect:

        queue_manager.disconnect(websocket)