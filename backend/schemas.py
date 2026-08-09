from pydantic import BaseModel
from typing import Optional

class JoinQueueRequest(BaseModel):
    name: str
    phone: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    avg_service_time: Optional[int] = None
    is_open: Optional[bool] = None