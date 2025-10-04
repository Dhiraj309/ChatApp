from fastapi import FastAPI, Request, HTTPException
from app.routers import chat, auth
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")
DB_URL = os.getenv("DB_URL")

FRONTEND_URL = os.getenv("FRONTEND_URL")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.middleware("http")
# async def verify_api_key(request: Request, call_next):
#     if request.method == "OPTIONS":  # skip preflight
#         return await call_next(request)
    
#     if request.url.path.startswith("/chat"):  # protect chat endpoints
#         auth = request.headers.get("Authorization")
#         if not auth or auth != f"Bearer {API_KEY}":
#             raise HTTPException(status_code=401, detail="Unauthorized")
#     return await call_next(request)

@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    # Only protect chat endpoints, skip /chat/upload
    if request.url.path.startswith("/chat") and request.url.path != "/chat/upload":
        auth = request.headers.get("Authorization")
        if not auth or auth != f"Bearer {API_KEY}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    return await call_next(request)

app.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"]
)

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)

@app.get("/")
def root():
    return {
        "message": "Backend Is Running!"

    }

@app.get("/health")
def health():
    return {
        "status": "Ok"
    }
