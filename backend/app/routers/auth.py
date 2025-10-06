from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.crud import get_user_by_email, verify_pass
from pydantic import BaseModel
import os
import jwt
from datetime import datetime, timedelta

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

class LoginPayload(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user or not verify_pass(payload.password, user.passw):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "sub": user.email,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "id": user.id,
        "email": user.email,
        "name": user.name
    }
