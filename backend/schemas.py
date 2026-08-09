from pydantic import BaseModel, Field
from typing import Optional


class JoinQueueRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(default=None, max_length=15)


class ConfigUpdateRequest(BaseModel):
    avg_service_time: Optional[int] = Field(default=None, ge=1, le=60)
    is_open: Optional[bool] = None


class AdminLoginRequest(BaseModel):
    password: str