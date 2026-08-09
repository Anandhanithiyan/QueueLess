from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import WebSocket

class QueueManager:
    def __init__(self):
        self.active_queue: List[Dict] = []
        self.served_history: List[Dict] = []
        self.token_counter: int = 1
        self.token_prefix: str = "A"
        self.avg_service_time: int = 5  # minutes per person
        self.return_buffer_minutes: int = 4
        self.is_open: bool = True
        self.active_websockets: List[WebSocket] = []

    # --- WebSocket Connections ---
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)

    async def broadcast_state(self):
        """Broadcasts current state to all connected clients."""
        payload = self.get_full_state()
        disconnected = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.append(ws)
        
        for ws in disconnected:
            self.disconnect(ws)

    # --- Queue Logic ---
    def join_queue(self, name: str, phone: Optional[str] = None) -> Dict:
        if not self.is_open:
            raise ValueError("Queue is currently closed.")

        token_id = f"{self.token_prefix}{self.token_counter:03d}"
        self.token_counter += 1

        now = datetime.now()
        entry = {
            "token": token_id,
            "name": name,
            "phone": phone,
            "joined_at": now.isoformat(),
            "status": "waiting"  # waiting | serving | completed | skipped | cancelled
        }
        self.active_queue.append(entry)
        return self._format_token_info(entry)

    def call_next(self) -> Optional[Dict]:
        """Completes current token and advances to the next waiting customer."""
        for item in self.active_queue:
            if item["status"] == "serving":
                item["status"] = "completed"
                self.served_history.append(item)
                self.active_queue.remove(item)
                break

        next_item = next((i for i in self.active_queue if i["status"] == "waiting"), None)
        if next_item:
            next_item["status"] = "serving"
            return next_item
        return None

    def skip_token(self, token_id: str) -> bool:
        for item in self.active_queue:
            if item["token"] == token_id:
                item["status"] = "skipped"
                self.served_history.append(item)
                self.active_queue.remove(item)
                return True
        return False

    def cancel_token(self, token_id: str) -> bool:
        for item in self.active_queue:
            if item["token"] == token_id:
                item["status"] = "cancelled"
                self.active_queue.remove(item)
                return True
        return False

    # --- Metric Computations ---
    def _calculate_metrics(self, token_id: str) -> Dict:
        waiting_list = [i for i in self.active_queue if i["status"] in ["waiting", "serving"]]
        
        try:
            position = next(idx for idx, i in enumerate(waiting_list) if i["token"] == token_id)
        except StopIteration:
            return {"position": -1, "people_ahead": 0, "eta_minutes": 0, "estimated_turn_time": None, "return_by_time": None, "can_leave": False}

        people_ahead = position
        eta_minutes = people_ahead * self.avg_service_time
        
        now = datetime.now()
        estimated_turn = now + timedelta(minutes=eta_minutes)
        return_by = estimated_turn - timedelta(minutes=self.return_buffer_minutes)
        
        # Smart return condition
        can_leave = eta_minutes > (self.return_buffer_minutes + 2)

        return {
            "position": position + 1,
            "people_ahead": people_ahead,
            "eta_minutes": eta_minutes,
            "estimated_turn_time": estimated_turn.strftime("%I:%M %p"),
            "return_by_time": return_by.strftime("%I:%M %p"),
            "can_leave": can_leave
        }

    def _format_token_info(self, item: Dict) -> Dict:
        metrics = self._calculate_metrics(item["token"])
        return {**item, **metrics}

    def get_full_state(self) -> Dict:
        currently_serving = next((i for i in self.active_queue if i["status"] == "serving"), None)
        waiting = [self._format_token_info(i) for i in self.active_queue if i["status"] == "waiting"]

        return {
            "is_open": self.is_open,
            "avg_service_time": self.avg_service_time,
            "currently_serving": currently_serving,
            "waiting_queue": waiting,
            "total_waiting": len(waiting),
            "total_served_today": len(self.served_history)
        }

queue_manager = QueueManager()