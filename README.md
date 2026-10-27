# originW2745 Dairy IoT backend

FastAPI + PostgreSQL API for ESP32 devices, environmental provider data, GPS tracking, alerts, and live milk-kit telemetry. Swagger is at `http://localhost:8000/docs`; REST paths are under `/api/v1`.

## Local setup

1. Create a virtual environment: `python -m venv .venv`, then activate it with `.\.venv\Scripts\Activate.ps1` (PowerShell).
2. Install packages: `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env`, then set `DATABASE_URL` to your PostgreSQL credentials. Do not commit `.env`.
4. Create the database named `originw2745`, then run `alembic upgrade head`.
5. Load development devices and sensor definitions: `python -m app.seed`.
6. Start the server: `uvicorn app.main:app --reload`.

## Docker

Copy `.env.example` to `.env` (the supplied Docker URL targets service `db`) and run `docker compose up --build`. In another terminal run `docker compose exec api python -m app.seed`, then `curl -X POST 'http://localhost:8000/api/v1/simulate?count=24'`. Docker starts Mosquitto on port 1883 and the API subscribes to `cows/+/milk`.

## API testing

Use Swagger `/docs`, or run the simulation endpoint after seeding. Key dashboard calls are:

- `GET /api/v1/readings/current?device_id=1`
- `GET /api/v1/readings/history?device_id=1&sensor_type=temperature`
- `GET /api/v1/locations/current?device_id=1`
- `GET /api/v1/locations/history?device_id=1`
- `GET /api/v1/environment/current` and `GET /api/v1/environment/history`
- `GET /api/v1/alerts`, `GET/POST /api/v1/alert-thresholds`
- `GET /api/v1/cows/COW_001/milk/latest`
- `GET /api/v1/cows/COW_001/milk/history?limit=100`
- WebSocket `/ws/cows/COW_001/milk`

`POST /api/v1/simulate?count=24` creates repeatable-shape simulated device readings and GPS points. The external provider is configured by `ENVIRONMENT_PROVIDER`, `ENVIRONMENT_BASE_URL`, `ENVIRONMENT_API_KEY`, and farm coordinates. Its key is server-only and never returned in an API response.

## Live milk-kit MQTT pipeline

Set `MQTT_ENABLED=true`. For Docker, Compose routes the API to broker service `mqtt`; for local FastAPI development set `MQTT_BROKER_HOST=localhost`. `MQTT_BROKER_PORT` defaults to `1883`. Local Mosquitto allows anonymous connections for development and persists its data/logs in named Docker volumes. Do not expose this anonymous broker to an untrusted network.

Publish a prototype reading from a terminal with Mosquitto client tools:

```sh
mosquitto_pub -h localhost -p 1883 -t cows/COW_001/milk -m '{"cow_id":"COW_001","device_id":"MILK_KIT_001","sensor":"milk_kit","ph":6.72,"conductivity":4.82,"temperature":36.80,"risk_score":1,"status":"LOW_RISK"}'
```

The API validates each payload, stores valid readings in PostgreSQL, and broadcasts them to the cow-specific WebSocket. The dashboard opens the matching socket and loads the latest value plus up to 48 historical readings. The displayed risk score/status are prototype monitoring outputs, not a veterinary diagnosis.

## Dashboard connection

The existing React UI is unchanged visually. When **More information** is opened, it reads live sensor, GPS, and environmental data from the API. It uses `VITE_API_URL` when set; otherwise it calls `http://localhost:8000/api/v1`. The cards retain their existing sample values if the backend is unavailable.
