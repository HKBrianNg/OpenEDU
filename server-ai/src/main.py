# server-ai/src/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

from src.games.jungle.router import router as jungle_router
from src.labs.jungle.train_router import router as train_router

# ---------- 日志配置 ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Jungle AI Server", version="0.2.0")

# ---------- 请求日志中间件 ----------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    logger.info(f"→ {request.method} {request.url.path}")
    if body:
        logger.info(f"  Body: {body.decode('utf-8', errors='replace')}")

    response = await call_next(request)

    logger.info(f"← {response.status_code}")
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jungle_router, prefix="/api/games/jungle")
app.include_router(train_router, prefix="/api/labs/jungle")


@app.get("/api/health")
def health():
    return {"status": "ok", "game": "jungle", "version": "0.2.0"}