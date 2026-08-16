from collections import deque
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import WebSocket


class QueueManager:

    def __init__(self):
        self.active_queue: List[Dict] = []

        # Capped at 500 entries — prevents unbounded memory growth
        self.served_history: deque = deque(maxlen=500)

        self.token_counter: int = 1
        self.token_prefix: str = "A"

        # Fallback service time used when served_history is empty
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

        # Build a new list rather than mutating while iterating
        for item in list(self.active_queue):

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

        for item in list(self.active_queue):

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

        for item in list(self.active_queue):

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

    def _get_effective_avg_service_time(self) -> float:
        """
        Derive avg service time from the last 10 completed entries
        in served_history (joined_at → started_at = actual wait,
        but what we really want for ETA is service duration which we
        don't directly track yet, so we use the staff-set fallback
        blended with actual wait data as a proxy).

        More precisely: we track completed_at - started_at for
        entries that have both fields, giving true service duration.
        Fall back to the staff-set value if fewer than 3 samples.
        """
        samples = []

        for item in reversed(list(self.served_history)):

            if "started_at" in item and "completed_at" in item:

                started = datetime.fromisoformat(item["started_at"])
                completed = datetime.fromisoformat(item["completed_at"])
                duration = (completed - started).total_seconds() / 60

                if duration > 0:
                    samples.append(duration)

            if len(samples) >= 10:
                break

        if len(samples) >= 3:
            return round(sum(samples) / len(samples), 1)

        return self.avg_service_time

    def _calculate_metrics(self, token_id: str) -> Dict:
        """
        Compute position/ETA for a waiting customer only.

        Key corrections vs original:
        - active_items is WAITING only (serving customer excluded).
          The frontend already handles the serving case separately.
        - people_ahead is the 0-based index in the waiting list,
          which is now accurate (no off-by-one from serving slot).
        - Slot 0 (next in line) accounts for remaining time in the
          current service cycle, not a full avg_service_time cycle.
        """

        effective_avg = self._get_effective_avg_service_time()

        # Only waiting customers — serving customer not included
        waiting_items = [
            item
            for item in self.active_queue
            if item["status"] == "waiting"
        ]

        try:
            position = next(
                index
                for index, item in enumerate(waiting_items)
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

        # position 0 = next in line, people_ahead = 0
        people_ahead = position

        # Estimate remaining time in the current service cycle.
        # If nobody is being served, first slot has a full cycle.
        serving_item = next(
            (
                item
                for item in self.active_queue
                if item["status"] == "serving"
            ),
            None
        )

        if serving_item and "started_at" in serving_item:

            elapsed = (
                datetime.now()
                - datetime.fromisoformat(serving_item["started_at"])
            ).total_seconds() / 60

            remaining_for_current = max(
                0.0,
                effective_avg - elapsed
            )

        else:

            remaining_for_current = effective_avg

        if people_ahead == 0:
            # Next in line: wait only for current service to finish
            eta_minutes = remaining_for_current
        else:
            # remaining current slot + (people_ahead - 1) full slots
            # + their own slot starts after all ahead are done
            eta_minutes = (
                remaining_for_current
                + (people_ahead - 1) * effective_avg
                + effective_avg  # their full slot begins after all ahead
            )
            # Simplified: remaining + people_ahead full slots
            # (first slot is partial, rest are full)
            eta_minutes = remaining_for_current + people_ahead * effective_avg

        now = datetime.now()

        estimated_turn = now + timedelta(minutes=eta_minutes)

        return_by = (
            estimated_turn
            - timedelta(minutes=self.return_buffer_minutes)
        )

        can_leave = eta_minutes > self.return_buffer_minutes + 2

        return {
            "position": position + 1,
            "people_ahead": people_ahead,
            "eta_minutes": round(eta_minutes),
            "estimated_turn_time": estimated_turn.strftime("%I:%M %p"),
            "return_by_time": return_by.strftime("%I:%M %p"),
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

    def get_stats(self, waiting_count: Optional[int] = None) -> Dict:
        """
        Pass pre-computed waiting_count from get_full_state to avoid
        re-iterating active_queue for the same broadcast payload.
        """

        if waiting_count is None:
            waiting_count = sum(
                1 for item in self.active_queue
                if item["status"] == "waiting"
            )

        serving_count = sum(
            1 for item in self.active_queue
            if item["status"] == "serving"
        )

        wait_times = []

        for item in self.served_history:

            if "joined_at" in item and "started_at" in item:

                joined = datetime.fromisoformat(item["joined_at"])
                started = datetime.fromisoformat(item["started_at"])
                wait_seconds = (started - joined).total_seconds()
                wait_times.append(max(0, wait_seconds / 60))

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
            "avg_service_time": self._get_effective_avg_service_time(),
            "is_open": self.is_open,
        }

    # ---------------------------------------------------------
    # State
    # ---------------------------------------------------------

    def get_full_state(self) -> Dict:

        currently_serving = next(
            (
                item
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

        total_waiting = len(waiting)

        # Pass currently_serving raw (no metrics — it's handled by
        # the frontend's isServing check) but include basic fields
        serving_payload = None
        if currently_serving:
            serving_payload = {
                "token": currently_serving["token"],
                "name": currently_serving["name"],
                "status": currently_serving["status"],
                "started_at": currently_serving.get("started_at"),
            }

        return {
            "is_open": self.is_open,
            "avg_service_time": self._get_effective_avg_service_time(),
            "currently_serving": serving_payload,
            "waiting_queue": waiting,
            "total_waiting": total_waiting,
            "total_served_today": len(self.served_history),
            # Reuse waiting_count to avoid re-iterating
            "stats": self.get_stats(waiting_count=total_waiting),
        }


queue_manager = QueueManager()
