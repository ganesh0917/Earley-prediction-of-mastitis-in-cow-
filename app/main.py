import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import environment_router, router
from app.core.config import get_settings
from app.services.mqtt_service import milk_kit_hub, start_mqtt_subscriber, stop_mqtt_subscriber


@asynccontextmanager
async def lifespan(_app: FastAPI):
    mqtt_client = start_mqtt_subscriber(asyncio.get_running_loop())
    try:
        yield
    finally:
        stop_mqtt_subscriber(mqtt_client)

app=FastAPI(title="originW2745 Dairy IoT API", version="1.0.0", description="REST API for dairy IoT devices, readings, locations, environment and alerts.", lifespan=lifespan)

# Add CORS middleware - accept both localhost and 127.0.0.1 origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "*",  # Fallback for any other origins in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValueError)
async def validation_error(_:Request, exc:ValueError): return JSONResponse(status_code=400,content={"detail":str(exc)})
app.include_router(router)
app.include_router(environment_router)


@app.websocket("/ws/cows/{cow_id}/milk")
async def milk_kit_updates(websocket: WebSocket, cow_id: str):
    await milk_kit_hub.connect(cow_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await milk_kit_hub.disconnect(cow_id, websocket)
