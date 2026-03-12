"""Notebook Approval App - Main FastAPI Application."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.db import db, init_schema
from server.routes import requests, users, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("Starting Notebook Approval App...")
    await init_schema()
    yield
    # Shutdown
    print("Shutting down...")
    await db.close()


app = FastAPI(
    title="Notebook Approval System",
    description="Databricks App for controlled notebook execution in production",
    version="1.0.0",
    lifespan=lifespan,
)

# Include API routes
app.include_router(requests.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    pool = await db.get_pool()
    return {
        "status": "healthy",
        "database": "connected" if pool else "demo_mode",
    }


# Serve React frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dir):
    # Serve static assets
    assets_dir = os.path.join(frontend_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes."""
        # Check if the path is a file in dist
        file_path = os.path.join(frontend_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(frontend_dir, "index.html"))
