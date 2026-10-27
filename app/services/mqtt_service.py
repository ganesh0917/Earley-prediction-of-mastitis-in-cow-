import asyncio
import logging
import re
from datetime import datetime, timezone

from fastapi import WebSocket
from pydantic import ValidationError
from sqlalchemy import select

from app import models, schemas
from app.core.config import get_settings
from app.db import SessionLocal

logger = logging.getLogger(__name__)


class MilkKitWebSocketHub:
    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, cow_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(cow_id, set()).add(websocket)

    async def disconnect(self, cow_id: str, websocket: WebSocket):
        async with self._lock:
            clients = self._connections.get(cow_id)
            if clients:
                clients.discard(websocket)
                if not clients:
                    self._connections.pop(cow_id, None)

    async def broadcast(self, cow_id: str, reading: dict):
        async with self._lock:
            clients = tuple(self._connections.get(cow_id, ()))
        stale = []
        for websocket in clients:
            try:
                await websocket.send_json(reading)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(cow_id, websocket)


milk_kit_hub = MilkKitWebSocketHub()


def start_mqtt_subscriber(event_loop: asyncio.AbstractEventLoop):
    settings = get_settings()
    if not settings.mqtt_enabled:
        logger.info("MQTT subscriber disabled by configuration")
        return None

    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        logger.error("MQTT is enabled, but paho-mqtt is not installed. Install requirements.txt to enable sensor ingestion.")
        return None

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=settings.mqtt_client_id,
    )

    def on_connect(mqtt_client, _userdata, _flags, reason_code, _properties):
        if reason_code.is_failure:
            logger.error("MQTT broker connection failed: %s", reason_code)
            return
        logger.info("Connected to MQTT broker %s:%s", settings.mqtt_broker_host, settings.mqtt_broker_port)
        result, _mid = mqtt_client.subscribe([("cows/+/milk", 1), ("cows/+/collar", 1)])
        if result != mqtt.MQTT_ERR_SUCCESS:
            logger.error("Could not subscribe to cow sensor topics: %s", result)
        else:
            logger.info("Subscribed to cows/+/milk and cows/+/collar")

    def on_disconnect(_mqtt_client, _userdata, _disconnect_flags, reason_code, _properties):
        if reason_code.is_failure:
            logger.warning("Disconnected from MQTT broker: %s", reason_code)

    def on_message(_mqtt_client, _userdata, message):
        collar_match = re.fullmatch(r"cows/([A-Za-z0-9_-]+)/collar", message.topic)
        if collar_match:
            try:
                payload = schemas.CollarPayload.model_validate_json(message.payload)
                if collar_match.group(1) != payload.cow_id or payload.sensor != "cow_collar":
                    raise ValueError("Collar topic or sensor does not match payload")
            except (ValidationError, ValueError, UnicodeDecodeError) as exc:
                logger.warning("Ignoring invalid collar MQTT message on %s: %s", message.topic, exc)
                return
            except Exception:
                logger.exception("Unable to parse collar MQTT message on %s", message.topic)
                return

            try:
                with SessionLocal() as db:
                    reading = models.CollarReading(
                        **payload.model_dump(exclude={"sensor"}),
                        timestamp=datetime.now(timezone.utc),
                    )
                    db.add(reading)
                    if payload.satellites > 0:
                        device = db.scalar(
                            select(models.Device)
                            .join(models.CattleProfile, models.CattleProfile.device_id == models.Device.id)
                            .where(models.CattleProfile.cattle_id == payload.cow_id)
                        )
                        if device is None and payload.cow_id.upper().replace("-", "_") == "COW_001":
                            device = db.scalar(
                                select(models.Device)
                                .where(models.Device.device_type == "collar")
                                .order_by(models.Device.id)
                            )
                        if device:
                            db.add(models.LocationReading(
                                device_id=device.id,
                                latitude=payload.latitude,
                                longitude=payload.longitude,
                                altitude=payload.altitude,
                                timestamp=datetime.now(timezone.utc),
                            ))
                    db.commit()
                logger.debug("Stored collar reading for cow %s", payload.cow_id)
            except Exception:
                logger.exception("Failed to persist collar reading for cow %s", payload.cow_id)
            return

        try:
            payload = schemas.MilkKitPayload.model_validate_json(message.payload)
            topic_match = re.fullmatch(r"cows/([A-Za-z0-9_-]+)/milk", message.topic)
            if not topic_match or topic_match.group(1) != payload.cow_id:
                raise ValueError("MQTT topic cow ID does not match payload cow_id")
            if payload.sensor != "milk_kit":
                raise ValueError("Unsupported sensor type")
        except (ValidationError, ValueError, UnicodeDecodeError) as exc:
            logger.warning("Ignoring invalid milk-kit MQTT message on %s: %s", message.topic, exc)
            return
        except Exception:
            logger.exception("Unable to parse milk-kit MQTT message on %s", message.topic)
            return

        timestamp = datetime.now(timezone.utc)
        try:
            with SessionLocal() as db:
                reading = models.MilkKitReading(
                    cow_id=payload.cow_id,
                    device_id=payload.device_id,
                    ph=payload.ph,
                    conductivity=payload.conductivity,
                    temperature=payload.temperature,
                    risk_score=payload.risk_score,
                    status=payload.status,
                    timestamp=timestamp,
                )
                db.add(reading)
                db.commit()
                db.refresh(reading)
                data = schemas.MilkKitReadingOut.model_validate(reading).model_dump(mode="json")
            asyncio.run_coroutine_threadsafe(milk_kit_hub.broadcast(payload.cow_id, data), event_loop)
        except Exception:
            logger.exception("Failed to persist/broadcast milk-kit reading for cow %s", payload.cow_id)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    try:
        client.connect_async(settings.mqtt_broker_host, settings.mqtt_broker_port, keepalive=60)
        client.loop_start()
    except Exception:
        logger.exception("Unable to start MQTT subscriber")
        return None
    return client


def stop_mqtt_subscriber(client):
    if client is None:
        return
    try:
        client.disconnect()
        client.loop_stop()
    except Exception:
        logger.exception("Error while stopping MQTT subscriber")
