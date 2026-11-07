from pydantic import BaseModel, Field


class DiscoverRequest(BaseModel):
    role: str = Field(min_length=2, max_length=120)
    country: str = Field(default="Global", max_length=80)
    keywords: str = Field(default="", max_length=250)


class ChatRequest(BaseModel):
    job_id: str
    message: str = Field(min_length=1, max_length=3000)
