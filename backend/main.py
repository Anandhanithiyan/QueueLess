from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from queue_manager import queue_manager
from schemas import JoinQueueRequest, ConfigUpdateRequest

app = FastAPI(title="QueueLess Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Customer APIs ---
@app.post("/api/queue/join")
async def join_queue(payload: JoinQueueRequest):
    try:
        token_info = queue_manager.join_queue(payload.name, payload.phone)
        await queue_manager.broadcast_state()
        return token_info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/queue/leave/{token_id}")
async def leave_queue(token_id: str):
    success = queue_manager.cancel_token(token_id)
    if not success:
        raise HTTPException(status_code=404, detail="Token not found.")
    await queue_manager.broadcast_state()
    return {"status": "success", "token": token_id}

# --- Business Dashboard APIs ---
@app.get("/api/admin/state")
async def get_admin_state():
    return queue_manager.get_full_state()

@app.post("/api/admin/next")
async def call_next():
    item = queue_manager.call_next()
    await queue_manager.broadcast_state()
    return {"status": "success", "serving": item}

@app.post("/api/admin/skip/{token_id}")
async def skip_token(token_id: str):
    success = queue_manager.skip_token(token_id)
    if not success:
        raise HTTPException(status_code=404, detail="Token not found.")
    await queue_manager.broadcast_state()
    return {"status": "success", "skipped": token_id}

@app.patch("/api/admin/config")
async def update_config(payload: ConfigUpdateRequest):
    if payload.avg_service_time is not None:
        queue_manager.avg_service_time = payload.avg_service_time
    if payload.is_open is not None:
        queue_manager.is_open = payload.is_open
    await queue_manager.broadcast_state()
    return {"status": "success", "is_open": queue_manager.is_open, "avg_service_time": queue_manager.avg_service_time}

# --- Realtime WebSocket Channel ---
@app.websocket("/ws/queue")
async def queue_websocket(websocket: WebSocket):
    await queue_manager.connect(websocket)
    await websocket.send_json(queue_manager.get_full_state())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        queue_manager.disconnect(websocket)