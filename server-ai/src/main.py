from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.games.jungle.router import router

app = FastAPI(title="Jungle AI Server", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/games/jungle")


@app.get("/api/health")
def health():
    return {"status": "ok", "game": "jungle", "version": "0.2.0"}