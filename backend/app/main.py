from fastapi import FastAPI
from app.routers import chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    chat.router,
    prefix = "/chat",
    tags = ["chat"]
)

@app.get("/")
def root():
    return {
        "message": "Backend Is Running!"
    }
