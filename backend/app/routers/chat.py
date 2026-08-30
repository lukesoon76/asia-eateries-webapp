from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.chat_agent import ChatAgentError, run_chat
from app.schemas import ChatRequest, ChatResponse

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
def chat(request: Request, body: ChatRequest):
    conversation_id = body.conversation_id or str(uuid.uuid4())
    try:
        result = run_chat(body.message, conversation_id)
    except ChatAgentError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return result
