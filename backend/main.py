import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from .app import create_app

app: FastAPI = create_app()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def serve_root():
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"message": "Frontend files not found. Please build the frontend."}


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # if it looks like an API path, let FastAPI return 404 if not matched by routers
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"message": "Frontend files not found. Please build the frontend."}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
