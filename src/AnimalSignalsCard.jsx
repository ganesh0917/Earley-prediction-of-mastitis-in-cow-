import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
const STALE_AFTER_MS = 15_000

const demoCollarReading = () => {
  const minute = Math.floor(Date.now() / 60_000)
  const wave = Math.sin(minute / 5)
  return {
    cow_id: 'COW_001', device_id: 'COLLAR_001', sensor: 'cow_collar',
    timestamp: new Date().toISOString(), body_temperature: Number((38.5 + wave * 0.12).toFixed(2)),
    ambient_temperature: Number((31.2 + wave * 0.5).toFixed(1)),
    activity: Math.round(58 + Math.sin(minute / 3) * 12),
    activity_status: Math.sin(minute / 3) > 0.45 ? 'WALKING' : 'RESTING',
    hall_distance_cm: Number((42 + Math.sin(minute / 4) * 1.8).toFixed(1)),
    latitude: 13.0827 + Math.sin(minute / 18) * 0.00012,
    longitude: 80.2707 + Math.cos(minute / 18) * 0.00012,
    satellites: 9, altitude: 6.4, hall_raw: 2180,
    accel_x: 0.12, accel_y: -0.08, accel_z: 9.79,
    gyro_x: 0.01, gyro_y: -0.02, gyro_z: 0.03,
  }
}

export default function AnimalSignalsCard({ cowId, healthScore, onViewMap }) {
  const supportsCollar = String(cowId || '').trim().toUpperCase().replaceAll('-', '_') === 'COW_001'
  const [reading, setReading] = useState(null)
  const [serviceAvailable, setServiceAvailable] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!supportsCollar || !cowId) return undefined
    let stopped = false
    const refresh = async () => {
      try {
        const response = await fetch(`${API_BASE}/cows/${encodeURIComponent(cowId)}/collar/latest`)
        if (response.status === 404) {
          if (!stopped) { setReading(demoCollarReading()); setIsDemo(true); setServiceAvailable(true) }
          return
        }
        if (!response.ok) throw new Error('Animal signal service unavailable')
        const next = await response.json()
        if (!stopped) {
          setReading(next)
          setIsDemo(false)
          setServiceAvailable(true)
        }
      } catch {
        if (!stopped) { setServiceAvailable(false); setReading((current) => current || demoCollarReading()); setIsDemo((current) => current || !reading) }
      }
    }
    refresh()
    const poll = window.setInterval(refresh, 5000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { stopped = true; window.clearInterval(poll); window.clearInterval(tick) }
  }, [cowId, supportsCollar])

  useEffect(() => {
    if (!supportsCollar || !isDemo) return undefined
    const refreshDemo = window.setInterval(() => setReading(demoCollarReading()), 5000)
    return () => window.clearInterval(refreshDemo)
  }, [supportsCollar, isDemo])

  const timestamp = reading?.timestamp
  const timestampHasZone = timestamp && /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp)
  const parsedTimestamp = timestamp && new Date(timestampHasZone ? timestamp : `${timestamp}Z`)
  const fresh = supportsCollar && reading && parsedTimestamp && Number.isFinite(parsedTimestamp.getTime()) && now - parsedTimestamp.getTime() <= STALE_AFTER_MS
  const gpsHasFix = fresh && reading.satellites > 0
  const value = (number, digits = 2) => Number.isFinite(Number(number)) ? Number(number).toFixed(digits) : '—'
  const status = isDemo ? 'DEMO DATA' : !supportsCollar || !fresh ? 'NO CONNECTION' : 'LIVE FEED'
  const scoreColor = healthScore >= 85 ? '#10b981' : healthScore >= 70 ? '#f59e0b' : '#ef4444'

  return <article className="sensor-card animal-control-console">
    <header className="animal-console-header">
      <div><p className="animal-console-kicker">ORIGINW // ANIMAL TELEMETRY</p><h3>Animal signals</h3><span className="animal-console-id">ASSET {String(reading?.cow_id || cowId || 'UNKNOWN').replaceAll('-', '_')}</span></div>
      <span className={`animal-console-feed ${fresh && !isDemo ? 'is-live' : ''}`}><i />{status}</span>
    </header>
    {supportsCollar && Number.isFinite(healthScore) && <section className="animal-health-readout" aria-label="Animal health score">
      <div className="animal-health-heading"><span>HEALTH SCORE</span><strong style={{ color: scoreColor }}>{healthScore}<small>/100</small></strong></div>
      <div className="animal-health-track"><span style={{ width: `${Math.max(0, Math.min(100, healthScore))}%`, background: scoreColor }} /></div>
    </section>}
    {!supportsCollar && <div className="animal-console-empty">This animal has no collar connection. Animal signals are unavailable.</div>}
    {supportsCollar && !serviceAvailable && <div className="animal-console-empty">Animal signal service is unavailable. Reconnecting…</div>}
    {supportsCollar && serviceAvailable && !fresh && <div className="animal-console-empty">Waiting for a recent collar reading. The device publishes every 5 seconds.</div>}
    {fresh && <>
      {isDemo && <p className="animal-console-updated">SIMULATED CHENNAI FARM READINGS · CONNECT COLLAR FOR LIVE DATA</p>}
      <div className="animal-telemetry-grid">
        <div><span>BODY TEMPERATURE</span><strong>{value(reading.body_temperature)} <small>°C</small></strong></div>
        <div><span>AMBIENT TEMPERATURE</span><strong>{value(reading.ambient_temperature)} <small>°C</small></strong></div>
        <div><span>ACTIVITY STATE</span><strong>{reading.activity_status.replaceAll('_', ' ')}</strong><small>{value(reading.activity)} activity index</small></div>
        <div><span>HALL DISTANCE</span><strong>{value(reading.hall_distance_cm)} <small>cm</small></strong></div>
        <div><span>DEVICE ID</span><strong>{reading.device_id}</strong></div>
        <div><span>SENSOR</span><strong>{reading.sensor || 'cow_collar'}</strong></div>
        <div className="animal-telemetry-location"><span>GPS POSITION</span><strong>{gpsHasFix ? `${value(reading.latitude, 5)}, ${value(reading.longitude, 5)}` : 'NO FIX'}</strong></div>
        {gpsHasFix && <>
          <div><span>GPS SATELLITES</span><strong>{reading.satellites}</strong></div>
          <div><span>ALTITUDE</span><strong>{value(reading.altitude)} <small>m</small></strong></div>
        </>}
        {onViewMap && <div><span>POSITION VIEW</span><button className="animal-map-button" onClick={onViewMap}>Open map</button></div>}
      </div>
      <details className="collar-technical-details">
        <summary>IMU AND SENSOR DETAILS</summary>
        <p><span>Hall raw</span><b>{reading.hall_raw}</b></p>
        <p><span>Acceleration (m/s²)</span><b>{value(reading.accel_x)}, {value(reading.accel_y)}, {value(reading.accel_z)}</b></p>
        <p><span>Gyroscope (rad/s)</span><b>{value(reading.gyro_x)}, {value(reading.gyro_y)}, {value(reading.gyro_z)}</b></p>
      </details>
      <p className="animal-console-updated">LAST PACKET · {parsedTimestamp.toLocaleTimeString()}</p>
    </>}
    {supportsCollar && !fresh && onViewMap && <button className="animal-map-button animal-map-button-empty" onClick={onViewMap}>Open location map</button>}
  </article>
}
