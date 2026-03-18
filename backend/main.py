import os
from fastapi import FastAPI, HTTPException
from pathlib import Path
from fastapi.responses import FileResponse

from app import create_app

app: FastAPI = create_app()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/manual-de-uso")
async def serve_manual():
    # Build path relative to this file's directory to avoid CWD issues.
    ROOT_DIR = Path(__file__).resolve().parent
    manual_path = ROOT_DIR / "static" / "MANUAL_USUARIO.pdf"
    if manual_path.exists():
        return FileResponse(manual_path, media_type="application/pdf")
    return {"message": "Manual not found."}


@app.get("/")
async def serve_root():
    ROOT_DIR = Path(__file__).resolve().parent
    index_path = ROOT_DIR / "static" / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Frontend files not found. Please build the frontend."}


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    ROOT_DIR = Path(__file__).resolve().parent
    index_path = ROOT_DIR / "static" / "index.html"
    # if it looks like an API path, let FastAPI return 404 if not matched by routers
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Frontend files not found. Please build the frontend."}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
