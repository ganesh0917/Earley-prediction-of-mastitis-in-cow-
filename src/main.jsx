import { useEffect, useState, useRef } from 'react'
import i18n from './i18n/i18n'
import { useTranslation } from 'react-i18next'
import { createRoot } from 'react-dom/client'
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import "./i18n/i18n";
import MilkKitCard from './MilkKitCard'
import AnimalSignalsCard from './AnimalSignalsCard'

const Arrow = () => null
const languages = ['English', 'Tamil', 'Hindi', 'Urdu']

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
const demoFarmConditions = {
  latitude: 13.0827, longitude: 80.2707, temperature: 31.4, humidity: 68,
  pressure: 1008.2, rain: 0, cloud_cover: 42, wind_speed: 2.7,
  uv_index: 7, timestamp: new Date().toISOString(), source: 'demo',
}
const apiGet = async (path) => {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}
const apiPost = async (path, data) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}
const apiPatch = async (path, data) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}
const apiDelete = async (path) => {
  const response = await fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.status === 204 ? null : response.json()
}

function LoginModal({ role, onClose, onAuthenticated }) {
  const { t } = useTranslation()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const title = role === 'veterinarian' ? t('login.title_vet') : t('login.title_farmer')
  
  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      let userData
      if (isRegister) {
        userData = await apiPost('/auth/register', {
          username: id,
          password: password,
          role: role,
          first_name: firstName,
          last_name: lastName
        })
      } else {
        userData = await apiPost('/auth/login', {
          username: id,
          password: password
        })
      }
      
      // Store user session
      sessionStorage.setItem('userId', userData.id)
      sessionStorage.setItem('username', userData.username)
      sessionStorage.setItem('userRole', userData.role)
      
      setError(false)
      setNotice(isRegister ? 'Account created successfully!' : 'Login successful!')
      setTimeout(() => onAuthenticated(role, userData.id), 1000)
    } catch (err) {
      setError(true)
      setNotice(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChange = (setter) => (event) => {
    setter(event.target.value)
    setError(false)
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="close-button" onClick={onClose} aria-label={t('login.close_aria')}>×</button>
      <p className="eyebrow">{t('login.secure_access')}</p><h2 id="login-title">{title}<br />login.</h2><p className="modal-copy">{t('login.copy')}</p>
      <form onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <>
            <label htmlFor="first-name">First Name (Optional)</label>
            <input id="first-name" className={error ? 'invalid' : ''} value={firstName} onChange={handleChange(setFirstName)} placeholder="John" autoComplete="given-name" disabled={loading} />
            <label htmlFor="last-name">Last Name (Optional)</label>
            <input id="last-name" className={error ? 'invalid' : ''} value={lastName} onChange={handleChange(setLastName)} placeholder="Doe" autoComplete="family-name" disabled={loading} />
          </>
        )}
        <label htmlFor="user-id">{role === 'veterinarian' ? t('login.id_label_vet') : t('login.id_label_farmer')}</label>
        <input id="user-id" className={error ? 'invalid' : ''} value={id} onChange={handleChange(setId)} placeholder="farm123" autoComplete="username" disabled={loading} />
        <label htmlFor="password">{t('login.password_label')}</label>
        <input id="password" className={error ? 'invalid' : ''} value={password} onChange={handleChange(setPassword)} placeholder="•••" type="password" autoComplete="current-password" disabled={loading} />
        {error && <p className="error-message">{notice || t('login.error_message')}</p>}{notice && !error && <p className="success-message">{notice}</p>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Processing...' : (isRegister ? 'Create Account' : t('login.continue_button'))} <Arrow /></button>
      </form>
      <div className="account-actions">
        <button onClick={() => setIsRegister(!isRegister)} disabled={loading}>{isRegister ? 'Already have account? Login' : 'Need account? Register'}</button>
        <button onClick={() => setNotice(t('login.password_reset_message'))} disabled={loading}>{t('login.forgot_password')}</button>
      </div>
      <p className="credential-hint">{t('login.demo_credentials')}</p>
    </section>
  </div>
}

const farmers = Array.from({ length: 100 }, (_, index) => {
  const number = index + 1
  const names = ['Arun Kumar', 'Meena Devi', 'Karthik Raj', 'Priya S', 'Ravi Kumar', 'Lakshmi Devi', 'Mohan Raj', 'Anitha S', 'Senthil Kumar', 'Kavitha R']
  const cattleNames = ['Ganga', 'Lakshmi', 'Ponni', 'Nandini', 'Muthu', 'Rani', 'Kaveri', 'Malli', 'Sona', 'Vennila']
  const diseases = ['Healthy - routine review', 'Mastitis risk', 'Heat stress', 'Digestive concern', 'Lameness observation', 'Low activity alert']
  const count = 2 + (index % 4)
  return { 
    number, 
    name: names[index % names.length], 
    cattle: Array.from({ length: count }, (_, cattleIndex) => cattleNames[(index + cattleIndex) % cattleNames.length]).join(', '), 
    disease: diseases[index % diseases.length],
    // Enhanced data for veterinarian customer view
    id: 'FR-' + String(number).padStart(3, '0'),
    totalCattle: count,
    healthStatus: Math.random() > 0.7 ? 'Alert' : Math.random() > 0.5 ? 'Monitoring' : 'Healthy',
    lastVisit: `2025-09-${String(Math.floor(Math.random() * 15) + 1).padStart(2, '0')}`,
    location: ['Village A', 'Village B', 'Village C', 'District X'][Math.floor(Math.random() * 4)],
    phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    email: `farmer${number}@dairy.com`,
    overallHealth: Math.floor(Math.random() * 40 + 60) // 60-100%
  }
})

const clientCows = [
  { name: 'Lakshmi', age: '4 years', breed: 'Jersey cross', id: 'COW-001', status: 'Healthy', health: 95, milk: '16.8 L/day', lastCheckup: '2025-09-15', location: 'Pen A' },
  { name: 'Ganga', age: '5 years', breed: 'Holstein Friesian', id: 'COW-002', status: 'Monitoring', health: 78, milk: '18.2 L/day', lastCheckup: '2025-09-14', location: 'Pen B' },
  { name: 'Ponni', age: '3 years', breed: 'Jersey', id: 'COW-003', status: 'Healthy', health: 92, milk: '15.4 L/day', lastCheckup: '2025-09-15', location: 'Pen A' },
  { name: 'Nandini', age: '6 years', breed: 'Sahiwal', id: 'COW-004', status: 'Alert', health: 65, milk: '14.1 L/day', lastCheckup: '2025-09-13', location: 'Pen C' },
  { name: 'Muthu', age: '4 years', breed: 'Gir', id: 'COW-005', status: 'Healthy', health: 88, milk: '12.8 L/day', lastCheckup: '2025-09-15', location: 'Pen D' },
  { name: 'Rani', age: '5 years', breed: 'Jersey cross', id: 'COW-006', status: 'Healthy', health: 90, milk: '17.1 L/day', lastCheckup: '2025-09-15', location: 'Pen B' },
  { name: 'Kaveri', age: '3 years', breed: 'Holstein Friesian', id: 'COW-007', status: 'Healthy', health: 96, milk: '19.3 L/day', lastCheckup: '2025-09-15', location: 'Pen A' },
  { name: 'Malli', age: '4 years', breed: 'Sahiwal', id: 'COW-008', status: 'Monitoring', health: 72, milk: '11.6 L/day', lastCheckup: '2025-09-14', location: 'Pen C' },
  { name: 'Sona', age: '6 years', breed: 'Gir', id: 'COW-009', status: 'Healthy', health: 91, milk: '13.5 L/day', lastCheckup: '2025-09-15', location: 'Pen D' },
  { name: 'Vennila', age: '3 years', breed: 'Jersey', id: 'COW-010', status: 'Healthy', health: 93, milk: '15.9 L/day', lastCheckup: '2025-09-15', location: 'Pen A' }
]

function ClientCowList({ onBack, onContinue }) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchHistory, setSearchHistory] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Load search history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('clientSearchHistory')
    if (saved) setSearchHistory(JSON.parse(saved))
  }, [])
  
  // Filter cattle based on search term
  const filteredCows = searchTerm.trim() === '' 
    ? clientCows 
    : clientCows.filter(cow => cow.name.toLowerCase().includes(searchTerm.toLowerCase()))
  
  const handleSearch = (name) => {
    setSearchTerm(name)
    if (name.trim() !== '') {
      // Add to history (keep unique, max 3)
      const updated = [name, ...searchHistory.filter(h => h !== name)].slice(0, 3)
      setSearchHistory(updated)
      localStorage.setItem('clientSearchHistory', JSON.stringify(updated))
    }
    setShowSuggestions(false)
  }
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'Healthy': return '#52a672'
      case 'Monitoring': return '#f59e0b'
      case 'Alert': return '#ef4444'
      default: return '#6b7280'
    }
  }
  
  const getHealthColor = (health) => {
    if (health >= 85) return '#10b981'
    if (health >= 70) return '#f59e0b'
    return '#ef4444'
  }

  return <section className="app-dashboard cow-list-dashboard">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">{t('client_cow_list.eyebrow')}</p>
        <h2>{t('client_cow_list.title')}</h2>
        <p className="dashboard-subtitle">{t('client_cow_list.subtitle')}</p>
      </div>
      <button className="outline-button" onClick={onBack}>{t('client_cow_list.back_button')}</button>
    </header>

    {/* Search Section */}
    <div style={{ marginBottom: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Search by cattle name..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d1d6',
            fontSize: '14px',
            fontFamily: 'Manrope, sans-serif'
          }}
        />
        <button
          onClick={() => setSearchTerm('')}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#f5f5f7',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Clear
        </button>
      </div>
      
      {/* Search Suggestions */}
      {showSuggestions && searchHistory.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #d1d1d6',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100
        }}>
          <div style={{ padding: '8px' }}>
            <p style={{ fontSize: '12px', color: '#666', padding: '8px', margin: 0 }}>Recent Searches</p>
            {searchHistory.map((term, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(term)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f5f5f7'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
      <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0 0' }}>Found {filteredCows.length} of {clientCows.length} cattle</p>
    </div>

    <div className="cow-cards-grid">
      {filteredCows.map((cow, index) => {
        const isConnected = cow.id.trim().toUpperCase().replaceAll('-', '_') === 'COW_001'
        return (
        <article className="cow-card-professional" key={cow.id}>
          {/* Card Header with Status Badge */}
          <div className="cow-card-header">
            <div className="cow-card-title-section">
              <span className="cow-card-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="cow-card-name">{cow.name}.</h3>
                <p className="cow-card-id">{cow.id}</p>
              </div>
            </div>
            <span className="status-badge" style={{ backgroundColor: isConnected ? getStatusColor(cow.status) : '#6b7280' }}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {isConnected ? <div className="health-indicator">
            <div className="health-label">
              <span>Health Score</span>
              <strong style={{ color: getHealthColor(cow.health) }}>{cow.health}%</strong>
            </div>
            <div className="health-bar">
              <div className="health-bar-fill" style={{ width: `${cow.health}%`, backgroundColor: getHealthColor(cow.health) }} />
            </div>
          </div> : <div className="health-indicator milk-no-connection" role="status">
            Health and sensor data are unavailable because this animal is not connected.
          </div>}

          {/* Main Info Grid */}
          <div className="cow-info-grid">
            <div className="info-item">
              <span className="info-label">Breed</span>
              <strong className="info-value">{cow.breed}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <strong className="info-value">{cow.age}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Milk Yield</span>
              <strong className="info-value">{cow.milk}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Location</span>
              <strong className="info-value">{cow.location}</strong>
            </div>
          </div>

          {/* Secondary Info */}
          <div className="cow-secondary-info">
            <div className="secondary-item">
              <span className="secondary-icon"></span>
              <div>
                <p className="secondary-label">Last Checkup</p>
                <p className="secondary-value">{cow.lastCheckup}</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button className="cow-card-action-button" onClick={() => onContinue(cow.name, cow.age, cow.breed, cow.id.replace('-', '_'))}>
            {t('client_cow_list.continue_button')} <Arrow />
          </button>
        </article>
      )})}
    </div>
  </section>
}

// Mastitis Risk Predictor Component
function MasticsPredictor({ cowName = 'Lakshmi', isOpen = false, onClose }) {
  const { t } = useTranslation()
  const [analyzed, setAnalyzed] = useState(false)
  const [parameters, setParameters] = useState({
    scc: 180000,
    ec: 6.2,
    milkTemp: 38.5,
    milkYield: 18.5,
    milkPH: 6.7,
    ambientTemp: 31,
    humidity: 75,
    thi: 78,
    daysInMilk: 120,
    lactationNum: 2
  })
  const [baseline, setBaseline] = useState({
    scc: 100000,
    ec: 5.1,
    milkTemp: 38.2,
    milkYield: 20.0,
    milkPH: 6.6,
    ambientTemp: 25,
    humidity: 60,
    thi: 68,
    daysInMilk: 120,
    lactationNum: 2
  })
  const [result, setResult] = useState(null)

  const calculateDeviations = () => {
    const deviations = {
      scc: (((parameters.scc - baseline.scc) / baseline.scc) * 100).toFixed(1),
      ec: (((parameters.ec - baseline.ec) / baseline.ec) * 100).toFixed(1),
      milkYield: (((parameters.milkYield - baseline.milkYield) / baseline.milkYield) * 100).toFixed(1),
      milkTemp: (parameters.milkTemp - baseline.milkTemp).toFixed(1),
      milkPH: (((parameters.milkPH - baseline.milkPH) / baseline.milkPH) * 100).toFixed(1)
    }
    return deviations
  }

  const calculateRiskProbability = () => {
    const deviations = calculateDeviations()
    let riskScore = 0
    
    // SCC contribution (highest weight)
    if (parameters.scc > 250000) riskScore += 35
    else if (parameters.scc > 150000) riskScore += 25
    else if (parameters.scc > baseline.scc) riskScore += 15
    
    // EC contribution
    if (parameters.ec > 6.5) riskScore += 20
    else if (parameters.ec > baseline.ec) riskScore += 10
    
    // Milk yield decrease
    if (parseFloat(deviations.milkYield) < -10) riskScore += 15
    else if (parseFloat(deviations.milkYield) < 0) riskScore += 8
    
    // Temperature indicators
    if (parameters.milkTemp > 39) riskScore += 10
    else if (parameters.milkTemp > 38.5) riskScore += 5
    
    // pH changes
    if (parameters.milkPH > 6.8) riskScore += 5
    
    // Environmental heat stress
    if (parameters.thi > 75) riskScore += 8
    
    return Math.min(95, Math.max(5, riskScore))
  }

  const handleAnalyze = () => {
    const deviations = calculateDeviations()
    const probability = calculateRiskProbability()
    
    const contributingFactors = []
    if (deviations.scc > 20) contributingFactors.push('SCC increased substantially from baseline')
    if (deviations.ec > 15) contributingFactors.push('EC increased from baseline')
    if (parseFloat(deviations.milkYield) < -5) contributingFactors.push('Milk yield decreased from baseline')
    if (parseFloat(deviations.milkTemp) > 0.2) contributingFactors.push('Milk temperature elevated')
    if (parameters.thi > 75) contributingFactors.push('High thermal stress index')
    if (parameters.daysInMilk > 150) contributingFactors.push('Advanced lactation stage')
    
    setResult({
      deviations,
      probability,
      contributingFactors: contributingFactors.length > 0 ? contributingFactors : ['Cow appears healthy with normal parameters']
    })
    setAnalyzed(true)
  }

  if (!isOpen) return null

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="mastitis-predictor-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(100%, 900px)', maxHeight: '90vh', padding: '32px', borderRadius: '28px', background: '#fff', boxShadow: '0 24px 70px #00190b55', overflowY: 'auto' }}>
      <button className="close-button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', right: '19px', top: '16px', width: '30px', height: '30px', border: '0', borderRadius: '50%', color: '#555', background: '#f2f2f4', fontSize: '22px', lineHeight: '1', cursor: 'pointer' }}>×</button>
      
      <p className="eyebrow" style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', color: '#667eea', margin: '0 0 10px 0' }}>BOVINE MASTITIS PREDICTION</p>
      <h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>Risk Analysis for {cowName}</h2>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>Enter cow information below and click analyze to assess mastitis risk based on current and baseline health parameters</p>

      {!analyzed ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>SCC (cells/mL)</label><input type="number" value={parameters.scc} onChange={(e) => setParameters({...parameters, scc: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>EC (mS/cm)</label><input type="number" step="0.1" value={parameters.ec} onChange={(e) => setParameters({...parameters, ec: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Milk Temperature (°C)</label><input type="number" step="0.1" value={parameters.milkTemp} onChange={(e) => setParameters({...parameters, milkTemp: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Milk Yield (L/day)</label><input type="number" step="0.1" value={parameters.milkYield} onChange={(e) => setParameters({...parameters, milkYield: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Milk pH</label><input type="number" step="0.1" value={parameters.milkPH} onChange={(e) => setParameters({...parameters, milkPH: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Ambient Temp (°C)</label><input type="number" value={parameters.ambientTemp} onChange={(e) => setParameters({...parameters, ambientTemp: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Humidity (%)</label><input type="number" value={parameters.humidity} onChange={(e) => setParameters({...parameters, humidity: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>THI</label><input type="number" value={parameters.thi} onChange={(e) => setParameters({...parameters, thi: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Days in Milk</label><input type="number" value={parameters.daysInMilk} onChange={(e) => setParameters({...parameters, daysInMilk: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Lactation Number</label><input type="number" value={parameters.lactationNum} onChange={(e) => setParameters({...parameters, lactationNum: parseFloat(e.target.value)})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /></div>
        </div>
      ) : null}

      {analyzed && result && (
        <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px', color: '#1f2937' }}>Individual Cow Parameters with Baseline Values</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>SCC</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.scc.toLocaleString()} cells/mL</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.scc.toLocaleString()} cells/mL</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: result.deviations.scc > 0 ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Deviation: {result.deviations.scc > 0 ? '+' : ''}{result.deviations.scc}%</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Electrical Conductivity</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.ec.toFixed(1)} mS/cm</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.ec.toFixed(1)} mS/cm</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: result.deviations.ec > 0 ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Deviation: {result.deviations.ec > 0 ? '+' : ''}{result.deviations.ec}%</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Milk Temperature</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.milkTemp.toFixed(1)}°C</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.milkTemp.toFixed(1)}°C</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: result.deviations.milkTemp > 0 ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Change: {result.deviations.milkTemp > 0 ? '+' : ''}{result.deviations.milkTemp}°C</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Milk Yield</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.milkYield.toFixed(1)} L/day</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.milkYield.toFixed(1)} L/day</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: result.deviations.milkYield < 0 ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Deviation: {result.deviations.milkYield}%</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Milk pH</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.milkPH.toFixed(1)}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.milkPH.toFixed(1)}</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: result.deviations.milkPH > 1 ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Deviation: {result.deviations.milkPH > 0 ? '+' : ''}{result.deviations.milkPH}%</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Ambient Temperature</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.ambientTemp.toFixed(0)}°C</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.ambientTemp.toFixed(0)}°C</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: parameters.ambientTemp > baseline.ambientTemp ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Differential: {parameters.ambientTemp - baseline.ambientTemp > 0 ? '+' : ''}{(parameters.ambientTemp - baseline.ambientTemp).toFixed(0)}°C</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>Humidity</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.humidity.toFixed(0)}%</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.humidity.toFixed(0)}%</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: parameters.humidity > baseline.humidity ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Differential: {parameters.humidity - baseline.humidity > 0 ? '+' : ''}{(parameters.humidity - baseline.humidity).toFixed(0)}%</p>
            </div>
            <div style={{ background: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase' }}>THI</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0' }}>{parameters.thi.toFixed(0)}</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>Baseline: {baseline.thi.toFixed(0)}</p>
              <p style={{ fontSize: '11px', fontWeight: '700', color: parameters.thi > baseline.thi ? '#ef4444' : '#10b981', margin: '4px 0 0' }}>Differential: {parameters.thi - baseline.thi > 0 ? '+' : ''}{(parameters.thi - baseline.thi).toFixed(0)}</p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #fff4e6 0%, #ffe8cc 100%)', border: '2px solid #f59e0b', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', margin: '0 0 12px', textTransform: 'uppercase' }}>! MASTITIS RISK</p>
            <p style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b', margin: '0 0 4px' }}>Risk probability: {result.probability}%</p>
            <p style={{ fontSize: '12px', color: '#d97706', margin: '0' }}>
              {result.probability > 75 ? 'High Risk - Immediate intervention recommended' : 
               result.probability > 50 ? 'Moderate Risk - Closer monitoring needed' : 
               'Low Risk - Continue routine monitoring'}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', margin: '0 0 12px', textTransform: 'uppercase' }}>Main contributing changes:</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {result.contributingFactors.map((factor, index) => (
                <li key={index} style={{ fontSize: '13px', color: '#4b5563', margin: '6px 0', lineHeight: '1.4' }}>
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        {!analyzed ? (
          <button onClick={handleAnalyze} style={{ background: '#667eea', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)' }}>[ ANALYZE ]</button>
        ) : (
          <button onClick={() => setAnalyzed(false)} style={{ background: '#667eea', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)' }}>← Back to Input</button>
        )}
        <button onClick={onClose} style={{ background: 'white', color: '#667eea', padding: '12px 24px', borderRadius: '8px', border: '2px solid #667eea', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>Close</button>
      </div>
    </section>
  </div>
}

function ClientDashboard({ onBack, viewer = 'client', cowName = 'Lakshmi', cowAge = '4 years', cowBreed = 'Jersey cross', cowId = 'COW_001', backButtonText = null, deviceId = 1 }) {
  const { t } = useTranslation()
  // Chennai is a demo location until the animal GPS device is connected.
  const cowLocation = { cowId, latitude: 13.0827, longitude: 80.2707 }
  const isCowConnected = String(cowId || '').trim().toUpperCase().replaceAll('-', '_') === 'COW_001'
  const animalHealthScore = isCowConnected
    ? clientCows.find((cow) => cow.id.trim().toUpperCase().replaceAll('-', '_') === 'COW_001')?.health ?? null
    : null
  const [environment, setEnvironment] = useState(null)
  const [location, setLocation] = useState(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [cards, setCards] = useState([
    [t('card_labels.age'), cowAge], [t('card_labels.lactation'), '2nd'], [t('card_labels.breed'), cowBreed], [t('card_labels.disease_history'), t('common.mild_mastitis')],
    [t('card_labels.vaccination'), t('common.up_to_date')], [t('card_labels.avg_milk_yield'), '16.8 L / day'], [t('card_labels.last_milk_test'), t('common.good') + ' · pH 6.7'], [t('card_labels.feeding_practices'), 'Green fodder + concentrate'],
    [t('card_labels.milking_schedule'), '5:30 AM · 4:30 PM'], [t('card_labels.health_risk'), t('common.low')], [t('card_labels.scc_count'), '145,000 cells/mL'], [t('card_labels.vet_interventions'), 'Routine health review']
  ])
  const [editing, setEditing] = useState(false)
  const [moreInfo, setMoreInfo] = useState(false)
  const [healthRecords, setHealthRecords] = useState([])
  const [isSampleRecords, setIsSampleRecords] = useState(false)
  const [editingRecords, setEditingRecords] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newRecord, setNewRecord] = useState({ date: '', disease: '', antibiotic: '', dosage: '', status: 'Active', notes: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [recordFiles, setRecordFiles] = useState({})
  const [uploadingRecordId, setUploadingRecordId] = useState(null)
  const fileInputRef = useRef(null)
  
  // Mastitis Predictor state
  const [showMasticsPredictor, setShowMasticsPredictor] = useState(false)
  
  // Clearly labeled demo content keeps the records dashboard populated until real records are available.
  const sampleRecords = [
    { id: 'demo-1', date: '2026-09-25', disease: 'Routine wellness check', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Active', notes: 'Demo entry: schedule a veterinarian review and enter verified findings here.' },
    { id: 'demo-2', date: '2026-09-22', disease: 'Vaccination record review', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Completed', notes: 'Demo entry: confirm dates and vaccine details against the farm record.' },
    { id: 'demo-3', date: '2026-09-18', disease: 'Hoof inspection', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Completed', notes: 'Demo entry: routine observation recorded; replace with the actual inspection notes.' },
    { id: 'demo-4', date: '2026-09-12', disease: 'Feed and hydration follow-up', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Active', notes: 'Demo entry: follow-up observation pending; add verified notes after review.' },
    { id: 'demo-5', date: '2026-09-03', disease: 'Body condition monitoring', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Completed', notes: 'Demo entry: use this record for a dated body condition observation.' },
    { id: 'demo-6', date: '2026-08-28', disease: 'General health follow-up', antibiotic: 'Not applicable', dosage: 'Not applicable', status: 'Resolved', notes: 'Demo entry: replace this sample with the animal’s verified veterinary history.' }
  ]

  useEffect(() => {
    loadHealthRecords()
  }, [deviceId])
  
  useEffect(() => {
    if (!moreInfo) return
    let mounted = true
    Promise.allSettled([apiGet('/environment/current'), apiGet('/locations/current')]).then((results) => {
      if (!mounted) return
      setEnvironment(results[0].status === 'fulfilled' ? results[0].value : demoFarmConditions)
      setLocation(results[1].status === 'fulfilled' ? results[1].value[0] : null)
    })
    return () => { mounted = false }
  }, [moreInfo])
  const loadHealthRecords = async () => {
    try {
      const records = await apiGet(`/health-records?device_id=${deviceId}`)
      if (records.length === 0) {
        setHealthRecords(sampleRecords)
        setIsSampleRecords(true)
      } else {
        setHealthRecords(records)
        setIsSampleRecords(false)
      }
    } catch (error) {
      console.error('Failed to load health records:', error)
      setHealthRecords(sampleRecords)
      setIsSampleRecords(true)
    }
  }
  
  const handleFileUpload = (event, recordId) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    
    setRecordFiles(prev => ({
      ...prev,
      [recordId]: [...(prev[recordId] || []), ...files]
    }))
    
    showMsg('success', `${files.length} file(s) uploaded for record #${recordId}`)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const removeFile = (recordId, fileIndex) => {
    setRecordFiles(prev => ({
      ...prev,
      [recordId]: prev[recordId].filter((_, idx) => idx !== fileIndex)
    }))
    showMsg('success', 'File removed')
  }
  
  const triggerFileUpload = (recordId) => {
    setUploadingRecordId(recordId)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }
  const updateCard = (index, value) => setCards(cards.map((card, cardIndex) => cardIndex === index ? [card[0], value] : card))
  const getBackButtonText = () => backButtonText || (viewer === 'veterinarian' ? '← Back to cattle' : t('client_dashboard.back_button'))
  
  const addHealthRecord = async () => {
    if (!newRecord.date || !newRecord.disease || !newRecord.antibiotic) {
      showMsg('error', 'Please fill in all required fields')
      return
    }
    try {
      setLoading(true)
      const created = await apiPost('/health-records', { ...newRecord, device_id: deviceId })
      setHealthRecords(isSampleRecords ? [created] : [created, ...healthRecords])
      setIsSampleRecords(false)
      setNewRecord({ date: '', disease: '', antibiotic: '', dosage: '', status: 'Active', notes: '' })
      // Clear attached files for new record
      setRecordFiles(prev => {
        const updated = { ...prev }
        delete updated['new']
        return updated
      })
      showMsg('success', 'Health record added successfully')
    } catch (error) {
      console.error('Failed to add health record:', error)
      showMsg('error', 'Failed to add health record')
    } finally {
      setLoading(false)
    }
  }
  
  const updateHealthRecord = async (id) => {
    const record = healthRecords.find(r => r.id === id)
    if (!record.date || !record.disease || !record.antibiotic) {
      showMsg('error', 'Please fill in all required fields')
      return
    }
    try {
      setLoading(true)
      const updated = await apiPatch(`/health-records/${id}`, { device_id: deviceId, date: record.date, disease: record.disease, antibiotic: record.antibiotic, dosage: record.dosage, status: record.status, notes: record.notes })
      setHealthRecords(healthRecords.map(r => r.id === id ? updated : r))
      setEditingId(null)
      showMsg('success', 'Health record updated successfully')
    } catch (error) {
      console.error('Failed to update health record:', error)
      showMsg('error', 'Failed to update health record')
    } finally {
      setLoading(false)
    }
  }
  
  const deleteHealthRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return
    try {
      setLoading(true)
      await apiDelete(`/health-records/${id}`)
      setHealthRecords(healthRecords.filter(record => record.id !== id))
      setEditingId(null)
      showMsg('success', 'Health record deleted successfully')
    } catch (error) {
      console.error('Failed to delete health record:', error)
      showMsg('error', 'Failed to delete health record')
    } finally {
      setLoading(false)
    }
  }
  
  const saveCattleProfile = async () => {
    try {
      setLoading(true)
      // Create a cattle profile object from the card data
      const cattleData = {
        device_id: deviceId,
        name: cowName,
        age: cards[0][1],
        breed: cards[2][1],
        cattle_id: 'COW-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
        status: 'Healthy',
        lactation: cards[1][1],
        disease_history: cards[3][1],
        vaccination: cards[4][1],
        milk_yield: cards[5][1],
        last_milk_test: cards[6][1],
        feeding_practices: cards[7][1],
        milking_schedule: cards[8][1],
        health_risk: cards[9][1],
        scc_count: cards[10][1],
        vet_interventions: cards[11][1]
      }
      
      const result = await apiPost('/cattle-profiles', cattleData)
      showMsg('success', 'Cattle profile saved successfully')
      setEditing(false)
    } catch (error) {
      console.error('Failed to save cattle profile:', error)
      showMsg('error', 'Failed to save cattle profile')
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return '#10b981'
      case 'Active': return '#f59e0b'
      case 'Completed': return '#3b82f6'
      case 'Alert': return '#ef4444'
      default: return '#6b7280'
    }
  }
  return <section className="app-dashboard cow-detail-dashboard" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh', paddingBottom: '40px' }}><header className="dashboard-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}><div><p className="eyebrow" style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9, margin: '0 0 10px 0' }}>{viewer === 'veterinarian' ? t('client_dashboard.eyebrow_vet') : t('client_dashboard.eyebrow_client')}</p><h2 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 5px 0', letterSpacing: '-0.5px' }}>{viewer === 'veterinarian' ? t('client_dashboard.greeting_vet') : t('client_dashboard.greeting_client')}</h2></div><div className="dashboard-actions" style={{ display: 'flex', gap: '12px' }}><button className="edit-button" onClick={() => { if (editing) { saveCattleProfile() } else { setEditing(true) } }} disabled={loading} style={{ background: 'white', color: '#667eea', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{editing ? t('client_dashboard.save_button') : t('client_dashboard.edit_button')}</button>{isCowConnected && <button className="mastitis-button" onClick={() => setShowMasticsPredictor(true)} disabled={loading} style={{ background: '#f59e0b', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>Mastitis Risk</button>}<button className="add-button" onClick={() => setEditingRecords(!editingRecords)} disabled={loading} style={{ background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>+ Add Record</button><button className="outline-button" onClick={onBack} style={{ background: 'transparent', color: 'white', padding: '12px 24px', borderRadius: '8px', border: '2px solid white', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>{getBackButtonText()}</button></div></header><div className="cow-hero" style={{ background: 'white', padding: '30px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}><div><p className="eyebrow" style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', color: '#667eea', margin: '0 0 10px 0' }}>{t('client_dashboard.profile_eyebrow')}</p><h1 style={{ fontSize: '48px', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>{cowName}.</h1><p style={{ fontSize: '18px', color: '#6b7280', margin: '0' }}>{t('client_dashboard.live_health')}</p></div><span className="health-pill" style={{ background: '#d1fae5', color: '#065f46', padding: '12px 20px', borderRadius: '20px', fontWeight: '600', fontSize: '14px' }}><i /> {t('client_dashboard.stable_monitored')}</span></div><div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '30px' }}>{cards.map(([label, value], index) => <article className={'detail-card' + (editing ? ' editing' : '')} key={label} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: editing ? '2px solid #667eea' : '1px solid #e5e7eb' }}><p style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6b7280', margin: '0 0 8px 0' }}>{label}</p>{editing ? <input aria-label={label} value={value} onChange={(event) => updateCard(index, event.target.value)} style={{ width: '100%', padding: '8px', fontSize: '18px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} /> : <strong style={{ fontSize: '20px', color: '#1f2937' }}>{value}</strong>}</article>)}</div><button className="more-button" onClick={() => setMoreInfo(!moreInfo)} disabled={editing} style={{ background: 'white', color: '#667eea', padding: '12px 24px', borderRadius: '8px', border: '2px solid #667eea', cursor: 'pointer', fontSize: '16px', fontWeight: '600', width: '100%', marginBottom: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>{moreInfo ? t('client_dashboard.hide_info_button') : t('client_dashboard.more_info_button')} <Arrow /></button>

      {/* Health Summary Stats Section */}
      <section className="health-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '1200px', margin: '0 auto 28px', padding: '0 20px' }}>
        <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #93c5fd', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.5px' }}>Total Records</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#1e40af', margin: '0' }}>{healthRecords.length}</p>
          <p style={{ fontSize: '11px', color: '#3b82f6', margin: '4px 0 0', fontWeight: '600' }}>Health entries tracked</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #6ee7b7', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.5px' }}>Resolved Cases</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#059669', margin: '0' }}>{healthRecords.filter(r => r.status === 'Resolved' || r.status === 'Completed').length}</p>
          <p style={{ fontSize: '11px', color: '#10b981', margin: '4px 0 0', fontWeight: '600' }}>Successfully treated</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #fcd34d', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.5px' }}>Active Cases</p>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', margin: '0' }}>{healthRecords.filter(r => r.status === 'Active').length}</p>
          <p style={{ fontSize: '11px', color: '#d97706', margin: '4px 0 0', fontWeight: '600' }}>Ongoing treatment</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #d8b4fe', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.5px' }}>&#128138; Common Condition</p>
          <p style={{ fontSize: '18px', fontWeight: '800', color: '#8b5cf6', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {healthRecords.length > 0 ? healthRecords[0]?.disease || 'N/A' : 'No data'}
          </p>
          <p style={{ fontSize: '11px', color: '#a855f7', margin: '4px 0 0', fontWeight: '600' }}>Most recent</p>
        </div>
      </section>

      {/* Health Records History Section */}
      <section className="health-records-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div className="health-records-header">
          <div>
            <p className="eyebrow" style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', color: '#667eea', margin: '0 0 10px 0' }}>MEDICAL HISTORY</p>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>Health Records & Treatment Logs.</h2>
            <p className="records-subtitle" style={{ fontSize: '16px', color: '#6b7280', margin: '0' }}>Complete vaccination, disease treatment, and antibiotic administration history</p>
            {isSampleRecords && <span className="sample-records-badge">DEMO RECORDS · Replace with verified animal history</span>}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="add-details-btn" onClick={() => setEditingRecords(true)} disabled={loading} style={{ background: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>Add Details</button>
            <button className={`edit-records-btn ${editingRecords ? 'active' : ''}`} onClick={() => setEditingRecords(!editingRecords)} style={{ background: editingRecords ? '#667eea' : 'white', color: editingRecords ? 'white' : '#667eea', padding: '12px 20px', borderRadius: '8px', border: '2px solid #667eea', cursor: 'pointer', fontSize: '15px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {editingRecords ? 'Done Editing' : 'Edit Records'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        {editingRecords && (
          <div className="add-record-form" style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 20px 0', color: '#1f2937' }}>Add New Health Record</h3>
            <div className="form-grid">
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Date</label>
                <input type="date" value={newRecord.date} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Disease/Condition</label>
                <input type="text" placeholder="e.g., Mastitis, Foot rot" value={newRecord.disease} onChange={(e) => setNewRecord({...newRecord, disease: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Antibiotic/Treatment</label>
                <input type="text" placeholder="e.g., Amoxicillin" value={newRecord.antibiotic} onChange={(e) => setNewRecord({...newRecord, antibiotic: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Dosage</label>
                <input type="text" placeholder="e.g., 500mg" value={newRecord.dosage} onChange={(e) => setNewRecord({...newRecord, dosage: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Status</label>
                <select value={newRecord.status} onChange={(e) => setNewRecord({...newRecord, status: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}>
                  <option>Active</option>
                  <option>Resolved</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Notes</label>
                <textarea placeholder="Treatment notes..." value={newRecord.notes} onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})} disabled={loading} style={{ width: '100%', padding: '10px 12px', fontSize: '15px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}></textarea>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="add-record-button" onClick={addHealthRecord} disabled={loading} style={{ flex: 1, background: '#10b981', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{loading ? 'Saving...' : '+ Add Record'}</button>
              <button onClick={() => triggerFileUpload('new')} disabled={loading} style={{ background: '#8b5cf6', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>Add File</button>
            </div>
            {recordFiles['new'] && recordFiles['new'].length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 10px 0' }}>&#128206; Attached Files ({recordFiles['new'].length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recordFiles['new'].map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>&#128196; {file.name}</span>
                      <button onClick={() => removeFile('new', idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '0', lineHeight: '1' }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="records-table-container">
          {healthRecords.length === 0 ? (
            <p className="no-records">No health records found. Click "Edit Records" to add one.</p>
          ) : (
            <div className="records-table">
              {healthRecords.map((record) => (
                <div className="record-card" key={record.id}>
                  {editingId === record.id ? (
                    <div className="record-edit-form">
                      <h4>Edit Health Record</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={record.date} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, date: e.target.value} : r))} disabled={loading} />
                        </div>
                        <div className="form-group">
                          <label>Disease/Condition</label>
                          <input type="text" value={record.disease} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, disease: e.target.value} : r))} disabled={loading} />
                        </div>
                        <div className="form-group">
                          <label>Antibiotic/Treatment</label>
                          <input type="text" value={record.antibiotic} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, antibiotic: e.target.value} : r))} disabled={loading} />
                        </div>
                        <div className="form-group">
                          <label>Dosage</label>
                          <input type="text" value={record.dosage} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, dosage: e.target.value} : r))} disabled={loading} />
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select value={record.status} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, status: e.target.value} : r))} disabled={loading}>
                            <option>Active</option>
                            <option>Resolved</option>
                            <option>Completed</option>
                          </select>
                        </div>
                        <div className="form-group full-width">
                          <label>Notes</label>
                          <textarea value={record.notes} onChange={(e) => setHealthRecords(healthRecords.map(r => r.id === record.id ? {...r, notes: e.target.value} : r))} disabled={loading}></textarea>
                        </div>
                      </div>
                      <div className="record-edit-actions">
                        <button className="save-record-btn" onClick={() => updateHealthRecord(record.id)} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                        <button className="cancel-record-btn" onClick={() => setEditingId(null)} disabled={loading}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="record-header">
                        <div className="record-date-disease">
                          <span className="record-date">&#128197; {record.date}</span>
                          <h4 className="record-disease">{record.disease}</h4>
                        </div>
                        <span className="record-status" style={{ backgroundColor: getStatusColor(record.status) }}>
                          {record.status}
                        </span>
                      </div>

                      {/* Treatment Metrics Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', padding: '14px', background: '#f9fafb', borderRadius: '10px' }}>
                        <div style={{ borderRight: '1px solid #e5e7eb' }}>
                          <p style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&#128336; Days in Treatment</p>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937', margin: '0' }}>
                            {Math.max(0, Math.ceil((new Date() - new Date(record.date)) / (1000 * 60 * 60 * 24)))}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>&#128200; Recovery Rate</p>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: record.status === 'Resolved' ? '#10b981' : record.status === 'Active' ? '#f59e0b' : '#3b82f6', margin: '0' }}>
                            {record.status === 'Resolved' ? '100%' : record.status === 'Completed' ? '95%' : '65%'}
                          </p>
                        </div>
                      </div>

                      <div className="record-details">
                        <div className="detail-item">
                          <span className="detail-icon">&#128138;</span>
                          <div>
                            <p className="detail-label">Antibiotic/Medicine</p>
                            <p className="detail-value">{record.antibiotic}</p>
                          </div>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">&#9878;&#65039;</span>
                          <div>
                            <p className="detail-label">Dosage & Frequency</p>
                            <p className="detail-value">{record.dosage} · Daily</p>
                          </div>
                        </div>

                        {/* Treatment Progress Indicator */}
                        <div className="detail-item full-width">
                          <span className="detail-icon"></span>
                          <div>
                            <p className="detail-label">Treatment Progress</p>
                            <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{
                                width: record.status === 'Resolved' ? '100%' : record.status === 'Completed' ? '95%' : '65%',
                                height: '100%',
                                background: record.status === 'Resolved' ? 'linear-gradient(90deg, #10b981, #059669)' : record.status === 'Active' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                          </div>
                        </div>

                        {record.notes && (
                          <div className="detail-item full-width">
                            <span className="detail-icon">&#128221;</span>
                            <div>
                              <p className="detail-label">Clinical Notes & Observations</p>
                              <p className="detail-value" style={{ marginTop: '6px', lineHeight: '1.5', fontSize: '13px', color: '#4b5563' }}>{record.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Additional Treatment Info */}
                        <div className="detail-item full-width">
                          <span className="detail-icon">&#128336;</span>
                          <div>
                            <p className="detail-label">Treatment Timeline</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                              <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                                <span style={{ fontWeight: '700', color: '#065f46' }}>Started:</span> {record.date}
                              </div>
                              <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #059669' }}>
                                <span style={{ fontWeight: '700', color: '#065f46' }}>Estimated End:</span> {new Date(new Date(record.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Uploaded Files Section */}
                        {recordFiles[record.id] && recordFiles[record.id].length > 0 && (
                          <div className="detail-item full-width">
                            <span className="detail-icon">&#128206;</span>
                            <div>
                              <p className="detail-label">Attached Files & Reports</p>
                              <div style={{ marginTop: '8px' }}>
                                {recordFiles[record.id].map((file, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: '6px', background: '#f5f5f7', borderRadius: '6px', fontSize: '12px', border: '1px solid #e5e7eb', borderLeft: '3px solid #8b5cf6' }}>
                                    <span style={{ fontWeight: '600', color: '#1f2937' }}>&#128196; {file.name}</span>
                                    <button onClick={() => removeFile(record.id, idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', fontWeight: '700' }}>Remove</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {editingRecords && (
                        <div className="record-actions">
                          <button className="edit-record-btn" onClick={() => setEditingId(record.id)} disabled={loading}>Edit</button>
                          <button className="upload-file-btn" onClick={() => triggerFileUpload(record.id)} disabled={loading} style={{ background: '#8b5cf6', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginRight: '8px' }}>Upload File</button>
                          <button className="delete-record-btn" onClick={() => deleteHealthRecord(record.id)} disabled={loading}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(e, uploadingRecordId)}
        />
      </section>

      <MasticsPredictor cowName={cowName} isOpen={showMasticsPredictor && isCowConnected} onClose={() => setShowMasticsPredictor(false)} />
      {moreInfo && <section className="live-section"><div className="live-heading"><p className="eyebrow">{t('client_dashboard.live_info_eyebrow')}</p><h2>{t('client_dashboard.live_info_title')}</h2></div><div className="live-grid"><AnimalSignalsCard cowId={cowId} healthScore={animalHealthScore} onViewMap={() => setShowMapModal(true)} /><MilkKitCard cowId={cowId} /><article className="sensor-card environment-sensor"><div className="sensor-image"><img src="/environment.png" alt="Environment monitor" /></div><p className="eyebrow">{t('client_dashboard.environment_eyebrow')} {environment?.source === 'demo' && <span className="milk-live-indicator">DEMO CONDITIONS</span>}</p><h3>{t('client_dashboard.environment_title')}</h3><div className="reading-list"><p><span>{t('client_dashboard.env_temperature_label')}</span><b>{environment ? environment.temperature + ' °C' : '—'}</b></p><p><span>{t('client_dashboard.humidity_label')}</span><b>{environment ? environment.humidity + '%' : '—'}</b></p><p><span>{t('client_dashboard.pressure_label')}</span><b>{environment ? environment.pressure + ' hPa' : '—'}</b></p><p><span>{t('client_dashboard.rain_label')}</span><b>{environment ? (environment.rain ?? 0) + ' mm / ' + (environment.cloud_cover ?? 0) + '%' : '—'}</b></p><p><span>{t('client_dashboard.wind_speed_label')}</span><b>{environment ? environment.wind_speed + ' m/s' : '—'}</b></p><p><span>{t('client_dashboard.uv_index_label')}</span><b>{environment ? environment.uv_index : '—'}</b></p></div></article></div></section>}<MapModal isOpen={showMapModal} onClose={() => setShowMapModal(false)} cowId={cowLocation.cowId} initialLocation={location} deviceId={deviceId} /></section>
}

// Veterinarian Customer List - Professional cards of farmers/customers
function VeterinarianCustomerList({ onBack, onSelectCustomer }) {
  const { t } = useTranslation()
  const [displayFarmers] = useState(farmers.slice(0, 20)) // Show first 20 for demo
  const [searchTerm, setSearchTerm] = useState('')
  const [searchHistory, setSearchHistory] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Load search history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vetSearchHistory')
    if (saved) setSearchHistory(JSON.parse(saved))
  }, [])
  
  // Filter farmers based on search term
  const filteredFarmers = searchTerm.trim() === ''
    ? displayFarmers
    : displayFarmers.filter(farmer => farmer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  
  const handleSearch = (name) => {
    setSearchTerm(name)
    if (name.trim() !== '') {
      // Add to history (keep unique, max 3)
      const updated = [name, ...searchHistory.filter(h => h !== name)].slice(0, 3)
      setSearchHistory(updated)
      localStorage.setItem('vetSearchHistory', JSON.stringify(updated))
    }
    setShowSuggestions(false)
  }
  
  const getHealthColor = (status) => {
    switch(status) {
      case 'Healthy': return '#10b981'
      case 'Monitoring': return '#f59e0b'
      case 'Alert': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return <section className="app-dashboard cow-list-dashboard">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">VETERINARIAN PORTAL</p>
        <h2>Farmer Clients.</h2>
        <p className="dashboard-subtitle">Manage health records for all your farmer clients and their cattle herds.</p>
      </div>
      <button className="outline-button" onClick={onBack}>← Back to home</button>
    </header>

    {/* Search Section */}
    <div style={{ marginBottom: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Search by farmer name..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d1d6',
            fontSize: '14px',
            fontFamily: 'Manrope, sans-serif'
          }}
        />
        <button
          onClick={() => setSearchTerm('')}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#f5f5f7',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Clear
        </button>
      </div>
      
      {/* Search Suggestions */}
      {showSuggestions && searchHistory.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #d1d1d6',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100
        }}>
          <div style={{ padding: '8px' }}>
            <p style={{ fontSize: '12px', color: '#666', padding: '8px', margin: 0 }}>Recent Searches</p>
            {searchHistory.map((term, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(term)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f5f5f7'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
      <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0 0' }}>Found {filteredFarmers.length} of {displayFarmers.length} farmers</p>
    </div>

    <div className="customer-cards-grid">
      {filteredFarmers.map((farmer) => (
        <article className="customer-card-professional" key={farmer.id}>
          {/* Header */}
          <div className="customer-card-header">
            <div className="customer-info-section">
              <span className="customer-number">{String(farmer.number).padStart(2, '0')}</span>
              <div>
                <h3 className="customer-name">{farmer.name}</h3>
                <p className="customer-id">{farmer.id}</p>
              </div>
            </div>
            <span className="health-badge" style={{ backgroundColor: getHealthColor(farmer.healthStatus) }}>
              {farmer.healthStatus}
            </span>
          </div>

          {/* Health Overview */}
          <div className="customer-health-bar">
            <div className="health-bar-label">
              <span>Herd Health</span>
              <strong style={{ color: getHealthColor(farmer.healthStatus) }}>{farmer.overallHealth}%</strong>
            </div>
            <div className="health-bar">
              <div className="health-bar-fill" style={{ width: `${farmer.overallHealth}%`, backgroundColor: getHealthColor(farmer.healthStatus) }} />
            </div>
          </div>

          {/* Info Grid */}
          <div className="customer-info-grid">
            <div className="customer-info-item">
              <span className="customer-info-label">Cattle</span>
              <strong className="customer-info-value">{farmer.totalCattle} head</strong>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">Location</span>
              <strong className="customer-info-value">{farmer.location}</strong>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">Last Visit</span>
              <strong className="customer-info-value">{farmer.lastVisit}</strong>
            </div>
            <div className="customer-info-item">
              <span className="customer-info-label">Status</span>
              <strong className="customer-info-value" style={{ color: getHealthColor(farmer.healthStatus) }}>{farmer.healthStatus}</strong>
            </div>
          </div>

          {/* Contact Info */}
          <div className="customer-contact">
            <div className="contact-item">
              <span className="contact-icon"></span>
              <p className="contact-text">{farmer.phone}</p>
            </div>
            <div className="contact-item">
              <span className="contact-icon"></span>
              <p className="contact-text">{farmer.email}</p>
            </div>
          </div>

          {/* Action Button */}
          <button className="customer-action-button" onClick={() => onSelectCustomer(farmer)}>
            View Cattle Details <Arrow />
          </button>
        </article>
      ))}
    </div>
  </section>
}

// Veterinarian viewing customer's cows - similar to farmer's cow list
function VeterinarianCustomerCowList({ onBack, onSelectCow, customer }) {
  const { t } = useTranslation()
  const [customerCows] = useState(clientCows) // Use same cow data
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'Healthy': return '#52a672'
      case 'Monitoring': return '#f59e0b'
      case 'Alert': return '#ef4444'
      default: return '#6b7280'
    }
  }
  
  const getHealthColor = (health) => {
    if (health >= 85) return '#10b981'
    if (health >= 70) return '#f59e0b'
    return '#ef4444'
  }

  return <section className="app-dashboard cow-list-dashboard">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">CUSTOMER CATTLE</p>
        <h2>{customer.name}'s Herd.</h2>
        <p className="dashboard-subtitle">{customer.totalCattle} cattle under veterinary care • {customer.location}</p>
      </div>
      <button className="outline-button" onClick={onBack}>← Back to customers</button>
    </header>

    <div className="cow-cards-grid">
      {customerCows.map((cow, index) => (
        <article className="cow-card-professional" key={cow.id}>
          <div className="cow-card-header">
            <div className="cow-card-title-section">
              <span className="cow-card-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="cow-card-name">{cow.name}.</h3>
                <p className="cow-card-id">{cow.id}</p>
              </div>
            </div>
            <span className="status-badge" style={{ backgroundColor: getStatusColor(cow.status) }}>
              {cow.status}
            </span>
          </div>

          <div className="health-indicator">
            <div className="health-label">
              <span>Health Score</span>
              <strong style={{ color: getHealthColor(cow.health) }}>{cow.health}%</strong>
            </div>
            <div className="health-bar">
              <div className="health-bar-fill" style={{ width: `${cow.health}%`, backgroundColor: getHealthColor(cow.health) }} />
            </div>
          </div>

          <div className="cow-info-grid">
            <div className="info-item">
              <span className="info-label">Breed</span>
              <strong className="info-value">{cow.breed}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <strong className="info-value">{cow.age}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Milk Yield</span>
              <strong className="info-value">{cow.milk}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">Location</span>
              <strong className="info-value">{cow.location}</strong>
            </div>
          </div>

          <div className="cow-secondary-info">
            <div className="secondary-item">
              <span className="secondary-icon"></span>
              <div>
                <p className="secondary-label">Last Checkup</p>
                <p className="secondary-value">{cow.lastCheckup}</p>
              </div>
            </div>
          </div>

          <button className="cow-card-action-button" onClick={() => onSelectCow(cow)}>
            View Full Profile <Arrow />
          </button>
        </article>
      ))}
    </div>
  </section>
}

function VeterinarianDashboard({ onBack, onView }) {
  const { t } = useTranslation()
  const [patients, setPatients] = useState(farmers)
  const [editing, setEditing] = useState(false)
  const updatePatient = (number, field, value) => setPatients(patients.map((patient) => patient.number === number ? { ...patient, [field]: value } : patient))
  return <section className="app-dashboard vet-dashboard"><header className="dashboard-header"><div><p className="eyebrow">{t('vet_dashboard.eyebrow')}</p><h2>{t('vet_dashboard.title')}</h2><p className="dashboard-subtitle">{t('vet_dashboard.subtitle')}</p></div><div className="dashboard-actions"><button className="edit-button" onClick={() => setEditing(!editing)}>{editing ? t('vet_dashboard.save_button') : t('vet_dashboard.edit_button')}</button><button className="outline-button" onClick={onBack}>{t('vet_dashboard.back_button')}</button></div></header><p className="edit-tip">{editing ? t('vet_dashboard.edit_tip_editing') : t('vet_dashboard.edit_tip_view')}</p><div className="patient-table-wrap"><table><thead><tr><th>{t('vet_dashboard.sno_header')}</th><th>{t('vet_dashboard.farmer_name_header')}</th><th>{t('vet_dashboard.cattle_details_header')}</th><th>{t('vet_dashboard.disease_status_header')}</th><th aria-label={t('vet_dashboard.view_patient_aria')} /></tr></thead><tbody>{patients.map((farmer) => <tr key={farmer.number}><td>{String(farmer.number).padStart(3, '0')}</td><td><b>{farmer.name}</b><small>Farmer ID: FR-{String(farmer.number).padStart(3, '0')}</small></td><td>{editing ? <input className="table-input" value={farmer.cattle} onChange={(event) => updatePatient(farmer.number, 'cattle', event.target.value)} /> : farmer.cattle}</td><td>{editing ? <input className="table-input" value={farmer.disease} onChange={(event) => updatePatient(farmer.number, 'disease', event.target.value)} /> : <span className={farmer.disease.startsWith('Healthy') ? 'condition healthy' : 'condition'}>{farmer.disease}</span>}</td><td><button className="view-button" onClick={onView}>{t('vet_dashboard.view_button')} <Arrow /></button></td></tr>)}</tbody></table></div></section>
}

function RoleModal({ onSelect, onClose }) {
  const { t } = useTranslation()
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="role-modal" role="dialog" aria-modal="true" aria-labelledby="role-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="close-button" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">{t('role_modal.eyebrow')}</p><h2 id="role-title">{t('role_modal.title')}</h2><p className="modal-copy">{t('role_modal.copy')}</p>
      <div className="role-options"><button onClick={() => onSelect('client')}><span className="role-icon">F</span><b>{t('role_modal.farmer_role')}</b><small>{t('role_modal.farmer_desc')}</small><Arrow /></button><button onClick={() => onSelect('veterinarian')}><span className="role-icon">V</span><b>{t('role_modal.vet_role')}</b><small>{t('role_modal.vet_desc')}</small><Arrow /></button></div>
    </section>
  </div>
}

// MapModal component for GPS map view
const DEMO_FARM_FENCE = [
  [13.0840, 80.2686], [13.0842, 80.2728], [13.0812, 80.2734],
  [13.0808, 80.2690], [13.0840, 80.2686]
]

function GeofenceMapView({ cowPosition }) {
  const map = useMap()
  useEffect(() => {
    const points = [...DEMO_FARM_FENCE, cowPosition]
    const latitudes = points.map(([lat]) => lat)
    const longitudes = points.map(([, lng]) => lng)
    map.fitBounds([[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]], { padding: [36, 36], maxZoom: 17 })
  }, [map, cowPosition[0], cowPosition[1]])
  return null
}

function MapModal({ isOpen, onClose, cowId, initialLocation, deviceId }) {
  const demoLocation = { latitude: 13.0827, longitude: 80.2707, timestamp: null, demo: true }
  const [locations, setLocations] = useState({ current: initialLocation, previous: null, demo: !initialLocation })

  useEffect(() => {
    if (!isOpen) return undefined
    let active = true
    const refreshLocations = async () => {
      try {
        const [currentRows, historyRows] = await Promise.all([
          apiGet(`/locations/current?device_id=${deviceId}`),
          apiGet(`/locations/history?device_id=${deviceId}&limit=2`)
        ])
        if (!active) return
        const current = currentRows[0] || historyRows[0] || null
        const previous = historyRows.find((row) => row.id !== current?.id) || null
        setLocations({ current: current || demoLocation, previous, demo: !current })
      } catch {
        if (active) setLocations((value) => value.current ? value : { current: demoLocation, previous: null, demo: true })
      }
    }
    refreshLocations()
    const timer = window.setInterval(refreshLocations, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [isOpen, deviceId])

  if (!isOpen) return null
  const current = locations.current || demoLocation
  const latitude = Number(current.latitude)
  const longitude = Number(current.longitude)
  const cowPosition = [latitude, longitude]
  const insideFence = latitude >= 13.0808 && latitude <= 13.0842 && longitude >= 80.2686 && longitude <= 80.2734
  const formatTime = (value) => value ? new Date(value).toLocaleString() : 'Demo position · Chennai'
  const coordinateText = (item) => item ? `${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}` : 'No earlier GPS fix recorded'
  const mapEntry = (title, item, fallback) => <div className="control-location-entry"><span className="control-entry-marker" /><div><small>{title}</small><b>{item ? coordinateText(item) : fallback}</b><span>{item ? formatTime(item.timestamp) : 'Waiting for GPS history'}</span></div></div>

  return <div className="modal-backdrop geofence-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="geofence-modal" role="dialog" aria-modal="true" aria-labelledby="geofence-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="geofence-header">
        <div><p className="geofence-kicker">ORIGINW // FIELD OPERATIONS</p><h2 id="geofence-title">Geofence control station</h2><p className="geofence-subtitle">Animal location surveillance · {cowId}</p></div>
        <div className="geofence-header-actions"><span className={`feed-state ${locations.demo ? 'demo' : ''}`}><i />{locations.demo ? 'DEMO POSITION' : 'GPS FEED LIVE'}</span><button className="geofence-close" onClick={onClose} aria-label="Close geofence view">×</button></div>
      </header>
      <div className="geofence-workspace">
        <aside className="geofence-console">
          <div className="console-section-title"><span>01 / ASSET STATUS</span><b>MONITORING</b></div>
          <div className="asset-ident"><div className="asset-icon">C</div><div><b>{cowId}</b><span>Smart animal collar</span></div></div>
          <div className={`fence-status ${insideFence ? 'inside' : 'outside'}`}><span className="fence-status-light" /><div><small>GEOFENCE STATUS</small><b>{insideFence ? 'INSIDE FARM BOUNDARY' : 'OUTSIDE FARM BOUNDARY'}</b></div></div>
          <div className="console-section-title location-section-title"><span>02 / LOCATION REPORT</span><span className="refresh-pulse">AUTO · 5 SEC</span></div>
          {mapEntry('CURRENT POSITION', current.demo ? null : current, `Chennai demo · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)}
          {mapEntry('PREVIOUS FIX', locations.previous, 'No previous GPS fix yet')}
          <div className="farm-meta"><span>FARM ZONE</span><b>Chennai demo perimeter</b><small>Temporary geofence · replace with farm coordinates</small></div>
          <div className="console-legend"><span><i className="legend-farm" /> Farm boundary</span><span><i className="legend-cow" /> Cow position</span></div>
        </aside>
        <div className="geofence-map-wrap">
          <div className="map-topline"><span>LIVE TERRAIN MAP</span><span>{latitude.toFixed(5)}° N&nbsp;&nbsp; {longitude.toFixed(5)}° E</span></div>
          <div className="geofence-map">
            <MapContainer center={cowPosition} zoom={16} scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polygon positions={DEMO_FARM_FENCE} pathOptions={{ color: '#ff1838', weight: 6, opacity: 1, fillColor: '#ff243f', fillOpacity: 0.34 }}>
                <Tooltip permanent direction="center" className="farm-map-label">DEMO FARM ZONE</Tooltip>
              </Polygon>
              <CircleMarker center={cowPosition} radius={19} pathOptions={{ color: '#c8ff68', weight: 1, fillColor: '#c8ff68', fillOpacity: 0.18, className: 'cow-pulse-ring' }} />
              <CircleMarker center={cowPosition} radius={8} pathOptions={{ color: '#10231b', weight: 3, fillColor: '#c8ff68', fillOpacity: 1 }}>
                <Tooltip permanent direction="top" offset={[0, -10]} className="cow-map-label">{cowId}</Tooltip>
              </CircleMarker>
              <GeofenceMapView cowPosition={cowPosition} />
            </MapContainer>
            <div className="map-corner-tag"><span /> FENCE OVERLAY ACTIVE</div>
          </div>
          <div className="map-footer"><span>{locations.demo ? 'SIMULATED CHENNAI LOCATION' : `LAST GPS UPDATE · ${formatTime(current.timestamp)}`}</span><a href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noreferrer">OPEN IN GOOGLE MAPS</a></div>
        </div>
      </div>
    </section>
  </div>
}
function App() {
  const { t } = useTranslation()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [language, setLanguage] = useState('English')
  const [roleOpen, setRoleOpen] = useState(false)
  const [loginRole, setLoginRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [selectedCow, setSelectedCow] = useState({ name: 'Lakshmi', age: '4 years', breed: 'Jersey cross', cowId: 'COW_001' })
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [vetDashboardView, setVetDashboardView] = useState('customer-list') // 'customer-list' | 'customer-cows' | 'customer-cow-detail'

  // Restore session from a previous login so refresh doesn't force re-login
  useEffect(() => {
    const savedUserId = sessionStorage.getItem('userId')
    const savedRole = sessionStorage.getItem('userRole')
    if (savedUserId && savedRole) {
      setUserId(savedUserId)
      setLoginRole(savedRole)
      setDashboard(savedRole === 'veterinarian' ? 'veterinarian' : 'client-list')
    }
  }, [])

  const openDashboard = (event) => {
    event.preventDefault()
    // Already logged in: skip role selection + login and go straight to the dashboard
    if (loginRole) {
      setDashboard(loginRole === 'veterinarian' ? 'veterinarian' : 'client-list')
      return
    }
    setRoleOpen(true)
  }
  const handleLanguageChange = (item) => {
    setLanguage(item)
    setLanguageOpen(false)
    const languageCodes = {
      English: 'en',
      Tamil: 'ta',
      Hindi: 'hi',
      Urdu: 'ur'
    }
    i18n.changeLanguage(languageCodes[item])
  }
  
  if (dashboard === 'veterinarian') {
    if (vetDashboardView === 'customer-list') return <VeterinarianCustomerList onBack={() => setDashboard(null)} onSelectCustomer={(customer) => { setSelectedCustomer(customer); setVetDashboardView('customer-cows') }} />
    if (vetDashboardView === 'customer-cows') return <VeterinarianCustomerCowList onBack={() => { setVetDashboardView('customer-list'); setSelectedCustomer(null) }} onSelectCow={(cow) => { setSelectedCow({ name: cow.name, age: cow.age, breed: cow.breed, cowId: cow.id.replace('-', '_') }); setVetDashboardView('customer-cow-detail') }} customer={selectedCustomer} />
    if (vetDashboardView === 'customer-cow-detail') return <ClientDashboard onBack={() => { setVetDashboardView('customer-cows'); setSelectedCow({}) }} viewer='veterinarian' userId={userId} cowName={selectedCow.name} cowAge={selectedCow.age} cowBreed={selectedCow.breed} cowId={selectedCow.cowId} deviceId={1} />
  }
  
  if (dashboard === 'client-list') return <ClientCowList onBack={() => setDashboard(null)} onContinue={(name, age, breed, cowId) => { setSelectedCow({ name, age, breed, cowId }); setDashboard('client') }} />
  if (dashboard === 'client') return <ClientDashboard onBack={() => setDashboard(null)} viewer={loginRole === 'veterinarian' ? 'veterinarian' : 'client'} userId={userId} cowName={selectedCow.name} cowAge={selectedCow.age} cowBreed={selectedCow.breed} cowId={selectedCow.cowId} deviceId={1} />
  
  return <main>
    <nav className="nav" aria-label="Main navigation"><a className="brand" href="#top">originW<span>2745</span></a><div className="nav-links"><a href="#solutions">{t('nav.solutions')}</a><a href="#about">{t('nav.about')}</a><button className="language-button" onClick={() => setLanguageOpen(!languageOpen)} aria-expanded={languageOpen}>Language: {language} <span className="chevron">⌄</span></button>{languageOpen && <div className="language-menu" role="menu">{languages.map((item) => <button key={item} role="menuitem" onClick={() => handleLanguageChange(item)}>{item}{item === language && <span>✓</span>}</button>)}</div>}<a className="dashboard-link" href="#dashboard" onClick={openDashboard}>{t('nav.dashboard')} <Arrow /></a></div></nav>
    
    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">{t('hero.title_eyebrow')}</p><h1>{t('hero.title_main')}</h1><p className="intro">{t('hero.intro')}</p><a className="text-link" href="#solutions">{t('hero.explore_link')} <Arrow /></a></div><div className="orb-wrap" aria-hidden="true"><div className="orb"><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-core">IoT</div><span className="signal signal-one" /><span className="signal signal-two" /><span className="signal signal-three" /></div></div></section>
    
    <section className="team-card" id="about"><div className="team-identity"><div className="team-logo-wrap"><img src="/team%20logo.png" alt="originW2745 team logo" /></div><div><p className="eyebrow">{t('team.eyebrow')}</p><h2>{t('team.name')}</h2></div></div><p className="team-note">{t('team.note')}</p></section>
    
    <section className="solutions" id="solutions"><div className="section-heading"><p className="eyebrow">{t('solutions.section_eyebrow')}</p><h2>{t('solutions.section_title')}</h2></div><div className="product-grid"><article className="product-card collar-card"><div className="card-head"><p className="eyebrow">{t('solutions.collar_eyebrow')}</p><span className="status"><i /> {t('solutions.collar_status')}</span></div><h3>{t('solutions.collar_title')}</h3><div className="product-image collar-image"><img src="/collar.png" alt="Smart cow collar" /></div><p className="description">{t('solutions.collar_desc1')}</p><p className="description">{t('solutions.collar_desc2')}</p><a className="text-link" href="#dashboard" onClick={openDashboard}>{t('solutions.collar_link')} <Arrow /></a></article><article className="product-card kit-card"><div className="card-head"><p className="eyebrow">{t('solutions.kit_eyebrow')}</p><span className="status"><i /> {t('solutions.kit_status')}</span></div><h3>{t('solutions.kit_title')}</h3><div className="product-image kit-image"><img src="/kit.png" alt="Smart milk-quality kit" /></div><p className="description">{t('solutions.kit_desc1')}</p><p className="description">{t('solutions.kit_desc2')}</p><a className="text-link" href="#dashboard" onClick={openDashboard}>{t('solutions.kit_link')} <Arrow /></a></article></div></section>
    
    <section className="dashboard-preview" id="dashboard"><div><p className="eyebrow">{t('dashboard_preview.eyebrow')}</p><h2>{t('dashboard_preview.title')}</h2></div><div className="metrics"><div><span>{t('dashboard_preview.animals_online')}</span><strong>48</strong><small>{t('dashboard_preview.animals_subtitle')}</small></div><div><span>{t('dashboard_preview.health_alerts')}</span><strong>02</strong><small>{t('dashboard_preview.health_subtitle')}</small></div><div><span>{t('dashboard_preview.milk_quality')}</span><strong>98%</strong><small>{t('dashboard_preview.milk_subtitle')}</small></div></div></section>
    
    <footer>{t('footer.text')}</footer>
    
    {roleOpen && <RoleModal onClose={() => setRoleOpen(false)} onSelect={(role) => { setRoleOpen(false); setLoginRole(role) }} />}
    {loginRole && <LoginModal role={loginRole} onClose={() => setLoginRole(null)} onAuthenticated={(role, userId) => { setLoginRole(role); setUserId(userId); if (role === 'client') { setDashboard('client-list') } else { setVetDashboardView('customer-list'); setDashboard('veterinarian') } }} />}
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
