from pydantic import BaseModel, Field


class ResumeChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
