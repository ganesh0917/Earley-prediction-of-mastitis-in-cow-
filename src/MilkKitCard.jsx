import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

const makeDemoMilkReading = (offset = 0) => {
  const minutes = Math.floor(Date.now() / 60_000) - offset
  const wave = Math.sin(minutes / 7)
  return {
    id: `demo-${minutes}`, cow_id: 'COW_001', device_id: 'MILK_KIT_001',
    timestamp: new Date(minutes * 60_000).toISOString(),
    ph: Number((6.68 + wave * 0.025).toFixed(2)),
    conductivity: Number((4.82 + Math.cos(minutes / 9) * 0.12).toFixed(2)),
    temperature: Number((36.8 + Math.sin(minutes / 11) * 0.25).toFixed(2)),
    risk_score: 12 + Math.round(Math.abs(wave) * 4), status: 'LOW_RISK',
  }
}

function Sparkline({ points, color, label, unit }) {
  const values = points.map((point) => Number(point)).filter(Number.isFinite)
  if (values.length < 2) {
    return <div className="milk-chart-empty">Waiting for more readings</div>
  }
  const low = Math.min(...values)
  const high = Math.max(...values)
  const spread = high - low || 1
  const coords = values.map((value, index) => `${(index / (values.length - 1)) * 100},${28 - ((value - low) / spread) * 23}`).join(' ')
  return <div className="milk-chart">
    <div className="milk-chart-heading"><span>{label}</span><strong>{values.at(-1).toFixed(2)} {unit}</strong></div>
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`${label} history`}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
}

export default function MilkKitCard({ cowId }) {
  const supportsMilkKit = String(cowId || '').trim().toUpperCase().replaceAll('-', '_') === 'COW_001'
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [connected, setConnected] = useState(false)
  const [serviceAvailable, setServiceAvailable] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (!supportsMilkKit || !cowId) return undefined
    let stopped = false
    let socket
    let reconnectTimer
    const endpoint = `${API_BASE}/cows/${encodeURIComponent(cowId)}/milk`

    fetch(`${endpoint}/latest`)
      .then((response) => response.ok ? response.json() : response.status === 404 ? 'demo' : Promise.reject(new Error('Milk kit API unavailable')))
      .then((reading) => {
        if (!stopped && reading === 'demo') {
          setLatest(makeDemoMilkReading())
          setIsDemo(true)
        } else if (!stopped && reading) {
          setLatest((current) => !current || new Date(reading.timestamp) >= new Date(current.timestamp) ? reading : current)
          setIsDemo(false)
        }
      })
      .catch(() => {
        if (!stopped) {
          setServiceAvailable(false)
          setLatest((current) => current || makeDemoMilkReading())
          setIsDemo((current) => current || !latest)
        }
      })
    fetch(`${endpoint}/history?limit=48`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Milk kit history unavailable')))
      .then((readings) => {
        if (!stopped) setHistory((current) => {
          if (!readings.length && current.length === 0) return Array.from({ length: 12 }, (_, index) => makeDemoMilkReading((11 - index) * 10))
          const merged = new Map([...readings, ...current].map((reading) => [`${reading.id}:${reading.timestamp}`, reading]))
          return [...merged.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-48)
        })
      })
      .catch(() => {
        if (!stopped) {
          setServiceAvailable(false)
          setHistory((current) => current.length ? current : Array.from({ length: 12 }, (_, index) => makeDemoMilkReading((11 - index) * 10)))
          setIsDemo((current) => current || !latest)
        }
      })

    const connect = () => {
      if (stopped) return
      const wsBase = API_BASE.replace(/^http/, 'ws')
      socket = new WebSocket(`${wsBase.replace(/\/api\/v1\/?$/, '')}/ws/cows/${encodeURIComponent(cowId)}/milk`)
      socket.onopen = () => { setConnected(true); setServiceAvailable(true) }
      socket.onmessage = (event) => {
        try {
          const reading = JSON.parse(event.data)
          if (stopped) return
          setIsDemo(false)
          setLatest((current) => !current || new Date(reading.timestamp) >= new Date(current.timestamp) ? reading : current)
          setHistory((previous) => {
            const merged = new Map([...previous, reading].map((item) => [`${item.id}:${item.timestamp}`, item]))
            return [...merged.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-48)
          })
        } catch { /* Ignore malformed server messages and keep the socket alive. */ }
      }
      socket.onclose = () => {
        setConnected(false)
        if (!stopped) reconnectTimer = window.setTimeout(connect, 2500)
      }
      socket.onerror = () => { setConnected(false); socket.close() }
    }
    connect()
    return () => {
      stopped = true
      window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [cowId, supportsMilkKit])

  if (!supportsMilkKit) {
    return <article className="sensor-card kit-sensor milk-kit-card">
      <div className="sensor-image"><img src="/kit.png" alt="Smart milk-quality kit" /></div>
      <p className="eyebrow">SMART MILK KIT <span className="milk-live-indicator milk-disconnected"><i />NO CONNECTION</span></p>
      <h3>{String(cowId || 'Animal').replaceAll('_', ' ')} · Milk readings</h3>
      <div className="milk-empty-state milk-no-connection">This animal has no milk-kit connection. Readings will appear here when a device is assigned.</div>
    </article>
  }

  const chronological = history.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const time = latest?.timestamp ? new Date(latest.timestamp).toLocaleString() : 'No reading yet'
  return <article className="sensor-card kit-sensor milk-kit-card">
    <div className="sensor-image"><img src="/kit.png" alt="Smart milk-quality kit" /></div>
    <p className="eyebrow">SMART MILK KIT <span className={`milk-live-indicator ${connected && !isDemo ? 'connected' : ''}`}><i />{isDemo ? 'DEMO DATA' : connected ? 'LIVE' : 'RECONNECTING'}</span></p>
    <h3>{cowId.replaceAll('_', ' ')} · Milk readings</h3>
    {!serviceAvailable && <p className="milk-service-note">Milk kit service is unavailable. Reconnecting…</p>}
    {!latest ? <div className="milk-empty-state">Waiting for the first milk-kit reading from this cow.</div> : <>
      <div className="milk-reading-grid">
        <div><span>Milk pH</span><strong>{latest.ph.toFixed(2)}</strong></div>
        <div><span>Conductivity</span><strong>{latest.conductivity.toFixed(2)} <small>mS/cm</small></strong></div>
        <div><span>Milk temperature</span><strong>{latest.temperature.toFixed(2)} <small>°C</small></strong></div>
        <div><span>Risk score</span><strong>{latest.risk_score}</strong></div>
      </div>
      <div className="milk-status-row"><span className="milk-status">{latest.status.replaceAll('_', ' ')}</span><span>Device {latest.device_id}</span></div>
      <p className="milk-updated">{isDemo ? 'Simulated Chennai farm sample · connect milk kit for live data' : `Last updated · ${time}`}</p>
      <div className="milk-history-grid">
        <Sparkline points={chronological.map((reading) => reading.ph)} color="#28734a" label="pH history" unit="pH" />
        <Sparkline points={chronological.map((reading) => reading.conductivity)} color="#397aa8" label="Conductivity history" unit="mS/cm" />
        <Sparkline points={chronological.map((reading) => reading.temperature)} color="#be7833" label="Temperature history" unit="°C" />
      </div>
      <p className="milk-disclaimer">{isDemo ? 'Illustrative sample only. Prototype risk estimate is not a veterinary diagnosis.' : 'Prototype sensor risk estimate for monitoring; not a veterinary diagnosis.'}</p>
    </>}
  </article>
}
