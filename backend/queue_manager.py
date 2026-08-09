from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import WebSocket


class QueueManager:

    def __init__(self):
        self.active_queue: List[Dict] = []
        self.served_history: List[Dict] = []

        self.token_counter: int = 1
        self.token_prefix: str = "A"

        self.avg_service_time: int = 5
        self.return_buffer_minutes: int = 4

        self.is_open: bool = True

        self.active_websockets: List[WebSocket] = []

    # ---------------------------------------------------------
    # WebSocket
    # ---------------------------------------------------------

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_websockets:
            self.active_websockets.remove(websocket)

    async def broadcast_state(self):
        payload = self.get_full_state()

        disconnected = []

        for websocket in self.active_websockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)

    # ---------------------------------------------------------
    # Customer
    # ---------------------------------------------------------

    def join_queue(
        self,
        name: str,
        phone: Optional[str] = None
    ) -> Dict:

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
            "status": "waiting",
        }

        self.active_queue.append(entry)

        return self.get_customer_state(token_id)

    def cancel_token(self, token_id: str) -> bool:

        for item in self.active_queue:

            if item["token"] == token_id:

                if item["status"] == "serving":
                    return False

                item["status"] = "cancelled"

                self.active_queue.remove(item)

                return True

        return False

    def get_customer_state(self, token_id: str) -> Optional[Dict]:

        item = next(
            (
                item
                for item in self.active_queue
                if item["token"] == token_id
            ),
            None
        )

        if not item:
            return None

        return self._format_token_info(item)

    # ---------------------------------------------------------
    # Business actions
    # ---------------------------------------------------------

    def call_next(self) -> Optional[Dict]:

        # Complete currently serving customer
        current = next(
            (
                item
                for item in self.active_queue
                if item["status"] == "serving"
            ),
            None
        )

        if current:

            current["status"] = "completed"
            current["completed_at"] = datetime.now().isoformat()

            self.served_history.append(current)

            self.active_queue.remove(current)

        # Find next waiting customer
        next_item = next(
            (
                item
                for item in self.active_queue
                if item["status"] == "waiting"
            ),
            None
        )

        if next_item:

            next_item["status"] = "serving"
            next_item["started_at"] = datetime.now().isoformat()

            return next_item

        return None

    def skip_token(self, token_id: str) -> bool:

        for item in self.active_queue:

            if item["token"] == token_id:

                if item["status"] == "serving":
                    return False

                item["status"] = "skipped"
                item["completed_at"] = datetime.now().isoformat()

                self.served_history.append(item)

                self.active_queue.remove(item)

                return True

        return False

    def remove_token(self, token_id: str) -> bool:

        for item in self.active_queue:

            if item["token"] == token_id:

                if item["status"] == "serving":
                    return False

                item["status"] = "removed"

                self.active_queue.remove(item)

                return True

        return False

    # ---------------------------------------------------------
    # Metrics
    # ---------------------------------------------------------

    def _calculate_metrics(self, token_id: str) -> Dict:

        active_items = [
            item
            for item in self.active_queue
            if item["status"] in ["waiting", "serving"]
        ]

        try:
            position = next(
                index
                for index, item in enumerate(active_items)
                if item["token"] == token_id
            )

        except StopIteration:

            return {
                "position": -1,
                "people_ahead": 0,
                "eta_minutes": 0,
                "estimated_turn_time": None,
                "return_by_time": None,
                "can_leave": False,
            }

        # Number of customers before this customer
        people_ahead = position

        eta_minutes = people_ahead * self.avg_service_time

        now = datetime.now()

        estimated_turn = (
            now + timedelta(minutes=eta_minutes)
        )

        return_by = (
            estimated_turn
            - timedelta(minutes=self.return_buffer_minutes)
        )

        can_leave = (
            eta_minutes > self.return_buffer_minutes + 2
        )

        return {
            "position": position + 1,
            "people_ahead": people_ahead,
            "eta_minutes": eta_minutes,
            "estimated_turn_time": estimated_turn.strftime(
                "%I:%M %p"
            ),
            "return_by_time": return_by.strftime(
                "%I:%M %p"
            ),
            "can_leave": can_leave,
        }

    def _format_token_info(self, item: Dict) -> Dict:

        metrics = self._calculate_metrics(item["token"])

        return {
            **item,
            **metrics
        }

    # ---------------------------------------------------------
    # Statistics
    # ---------------------------------------------------------

    def get_stats(self) -> Dict:

        waiting_count = len(
            [
                item
                for item in self.active_queue
                if item["status"] == "waiting"
            ]
        )

        serving_count = len(
            [
                item
                for item in self.active_queue
                if item["status"] == "serving"
            ]
        )

        wait_times = []

        for item in self.served_history:

            if "joined_at" in item and "started_at" in item:

                joined = datetime.fromisoformat(
                    item["joined_at"]
                )

                started = datetime.fromisoformat(
                    item["started_at"]
                )

                wait_seconds = (
                    started - joined
                ).total_seconds()

                wait_times.append(
                    max(0, wait_seconds / 60)
                )

        average_wait = (
            round(sum(wait_times) / len(wait_times), 1)
            if wait_times
            else 0
        )

        return {
            "queue_length": waiting_count,
            "currently_serving": serving_count,
            "total_served": len(self.served_history),
            "average_wait_minutes": average_wait,
            "avg_service_time": self.avg_service_time,
            "is_open": self.is_open,
        }

    # ---------------------------------------------------------
    # State
    # ---------------------------------------------------------

    def get_full_state(self) -> Dict:

        currently_serving = next(
            (
                self._format_token_info(item)
                for item in self.active_queue
                if item["status"] == "serving"
            ),
            None
        )

        waiting = [
            self._format_token_info(item)
            for item in self.active_queue
            if item["status"] == "waiting"
        ]

        return {
            "is_open": self.is_open,
            "avg_service_time": self.avg_service_time,
            "currently_serving": currently_serving,
            "waiting_queue": waiting,
            "total_waiting": len(waiting),
            "total_served_today": len(self.served_history),
            "stats": self.get_stats(),
        }


queue_manager = QueueManager()