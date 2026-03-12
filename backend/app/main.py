from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth as auth_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing special needed — Prisma handles migrations
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api/v1")

# Future modules — uncomment as they are built:
# from app.api.routes import inventory, suppliers, purchase_orders, shipments
# app.include_router(inventory.router,       prefix="/api/v1")
# app.include_router(suppliers.router,       prefix="/api/v1")
# app.include_router(purchase_orders.router, prefix="/api/v1")
# app.include_router(shipments.router,       prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return JSONResponse({"status": "ok", "version": settings.VERSION})
