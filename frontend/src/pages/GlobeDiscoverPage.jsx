import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import ConnectModal from '../components/ConnectModal';
import { getCoords, getCountryColor, normalizeCountryKey } from '../lib/geoData';
import {
  Search, SlidersHorizontal, X, UserPlus, MessageCircle,
  GraduationCap, MapPin, Users, Loader2,
} from 'lucide-react';
import './GlobeDiscoverPage.css';

// Some GeoJSON files use verbose names — map them to canonical names
const ADMIN_NAME_FIX = {
  'United States of America': 'United States',
  'Democratic Republic of the Congo': 'DR Congo',
  'Republic of the Congo': 'Congo',
  'Czechia': 'Czech Republic',
  'Russian Federation': 'Russia',
  'Republic of Korea': 'South Korea',
  'Korea, Republic of': 'South Korea',
  "Democratic People's Republic of Korea": 'North Korea',
  'Iran (Islamic Republic of)': 'Iran',
  'Syrian Arab Republic': 'Syria',
  'Viet Nam': 'Vietnam',
  'China, People\'s Republic': 'China',
  'Türkiye': 'Turkey',
  'Taiwan, Province of China': 'Taiwan',
};
const normalizeAdmin = (admin) =>
  normalizeCountryKey(ADMIN_NAME_FIX[admin] || admin);

const COUNTRIES_URL = 'https://cdn.jsdelivr.net/gh/datasets/geo-countries@main/data/countries.geojson';
// Module-level cache — fetched once per session
let _geoCache = null;
const fetchCountries = () => {
  if (_geoCache) return Promise.resolve(_geoCache);
  return fetch(COUNTRIES_URL).then((r) => r.json()).then((d) => { _geoCache = d; return d; }).catch(() => ({ features: [] }));
};

const GRAD = ['linear-gradient(135deg,#6366f1,#0ea5e9)', 'linear-gradient(135deg,#ec4899,#8b5cf6)', 'linear-gradient(135deg,#10b981,#06b6d4)', 'linear-gradient(135deg,#f59e0b,#ef4444)'];
const getGrad = (n) => GRAD[(n?.charCodeAt(0) ?? 0) % GRAD.length];
const getInit = (n) => n?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

export default function GlobeDiscoverPage() {
  const globeRef  = useRef(null);
  const navigate  = useNavigate();

  const [users,        setUsers]        = useState([]);
  const [countriesGeo, setCountriesGeo] = useState([]);
  const [sentReqs,     setSentReqs]     = useState(new Set());
  const [loading,      setLoading]      = useState(true);
  const [activeUser,   setActiveUser]   = useState(null);
  const [selCountry,   setSelCountry]   = useState(null);
  const [connectTgt,   setConnectTgt]   = useState(null);
  const [search,       setSearch]       = useState('');
  const [showFilter,   setShowFilter]   = useState(false);
  const [filters,      setFilters]      = useState({ country: '', university: '' });
  const [applied,      setApplied]      = useState({});
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight - 60 });

  // Responsive dims
  useEffect(() => {
    const upd = () => setDims({ w: window.innerWidth, h: window.innerHeight - 60 });
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  // Load data
  useEffect(() => {
    Promise.all([
      api.get('/users/globe'),
      api.get('/requests/outgoing'),
      fetchCountries(),
    ]).then(([gRes, rRes, geoJson]) => {
      const enriched = gRes.data.users.map((u) => ({
        ...u,
        ...getCoords(u.city, u.country, u._id),
        color: getCountryColor(u.country),
        countryKey: normalizeCountryKey(u.country),
      }));
      setUsers(enriched);
      setSentReqs(new Set(rRes.data.requests.filter((r) => r.status === 'pending').map((r) => r.to_user._id)));
      setCountriesGeo(geoJson.features);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Globe init: auto-rotate, set initial view
  useEffect(() => {
    if (loading || !globeRef.current) return;
    const ctrl = globeRef.current.controls();
    ctrl.autoRotate      = true;
    ctrl.autoRotateSpeed = 0.35;
    ctrl.enableZoom      = true;
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0);
  }, [loading]);

  const stopRotate = useCallback(() => {
    if (globeRef.current?.controls()) globeRef.current.controls().autoRotate = false;
  }, []);

  // Group users by country
  const byCountry = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (!map.has(u.countryKey)) map.set(u.countryKey, []);
      map.get(u.countryKey).push(u);
    });
    return map;
  }, [users]);

  // Filtered user dots
  const visibleUsers = useMemo(() => users.filter((u) => {
    const s = search.toLowerCase();
    if (s && !u.name?.toLowerCase().includes(s) && !u.country?.toLowerCase().includes(s)) return false;
    if (applied.country && !u.countryKey.includes(applied.country.toLowerCase())) return false;
    if (applied.university && !u.university?.toLowerCase().includes(applied.university.toLowerCase())) return false;
    return true;
  }), [users, search, applied]);

  // Resolve polygon color + student count
  const getPolyColor = useCallback((feat) => {
    const key   = normalizeAdmin(feat.properties?.ADMIN || '');
    const count = byCountry.get(key)?.length || 0;
    if (!count) return 'rgba(150,180,210,0.55)';
    return getCountryColor(feat.properties?.ADMIN || '') + 'dd';
  }, [byCountry]);

  const getPolySide = useCallback((feat) => {
    const key   = normalizeAdmin(feat.properties?.ADMIN || '');
    const count = byCountry.get(key)?.length || 0;
    return count ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)';
  }, [byCountry]);

  const getPolyAlt = useCallback((feat) => {
    const key   = normalizeAdmin(feat.properties?.ADMIN || '');
    const count = byCountry.get(key)?.length || 0;
    return count ? 0.014 : 0.004;
  }, [byCountry]);

  const getPolyLabel = useCallback((feat) => {
    const admin = feat.properties?.ADMIN || 'Unknown';
    const key   = normalizeAdmin(admin);
    const count = byCountry.get(key)?.length || 0;
    return `<div class="globe-tip"><strong>${admin}</strong>${count > 0 ? `<span>🎓 ${count} student${count > 1 ? 's' : ''}</span>` : '<span style="opacity:0.5">No students yet</span>'}</div>`;
  }, [byCountry]);

  const handlePolyClick = useCallback((feat) => {
    stopRotate();
    const admin = feat.properties?.ADMIN || '';
    const key   = normalizeAdmin(admin);
    const cu    = byCountry.get(key) || [];
    if (cu.length > 0) { setSelCountry({ name: admin, key, users: cu }); setActiveUser(null); }
  }, [byCountry, stopRotate]);

  // Click on user dot → show user card
  const handlePointClick = useCallback((pt) => {
    stopRotate();
    setActiveUser(pt);
    setSelCountry(null);
    globeRef.current?.pointOfView({ lat: pt.lat, lng: pt.lng, altitude: 1.5 }, 700);
  }, [stopRotate]);

  const applyFilters = () => { setApplied({ ...filters }); setShowFilter(false); };
  const clearAll     = () => { setFilters({ country: '', university: '' }); setApplied({}); setSearch(''); setSelCountry(null); };
  const activeCount  = Object.values(applied).filter(Boolean).length;

  return (
    <div className="globe-page" onMouseDown={stopRotate}>

      {/* ── Globe ── */}
      <div className="globe-canvas-wrap">
        {loading ? (
          <div className="globe-loading"><Loader2 size={36} className="spin" /><p>Loading student map…</p></div>
        ) : (
          <Globe
            ref={globeRef}
            width={dims.w}
            height={dims.h}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="rgba(120,160,255,0.35)"
            atmosphereAltitude={0.15}
            /* ── 3D Country Tiles ── */
            polygonsData={countriesGeo}
            polygonCapColor={getPolyColor}
            polygonSideColor={getPolySide}
            polygonStrokeColor={() => 'rgba(255,255,255,0.7)'}
            polygonAltitude={getPolyAlt}
            polygonLabel={getPolyLabel}
            onPolygonClick={handlePolyClick}
            onPolygonHover={() => {}}
            /* ── User dots ── */
            pointsData={visibleUsers}
            pointLat="lat"
            pointLng="lng"
            pointColor={(d) => d._id === activeUser?._id ? '#ffffff' : d.color}
            pointAltitude={0.018}
            pointRadius={0.45}
            pointLabel={(d) => `<div class="globe-tip"><strong>${d.name}</strong><span>${d.country || ''}</span></div>`}
            onPointClick={handlePointClick}
          />
        )}
      </div>

      {/* ── Top bar ── */}
      <div className="globe-topbar">
        <div className="globe-search-wrap">
          <Search size={14} className="globe-search-icon" />
          <input className="globe-search" placeholder="Search students, country…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="globe-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <button className={`globe-filter-btn ${activeCount ? 'active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
          <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="globe-filter-badge">{activeCount}</span>}
        </button>
        <div className="globe-count-pill">
          <span className="globe-count-dot" />{visibleUsers.length} students
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <div className="globe-filter-panel">
          <div className="globe-filter-row">
            <div className="form-group">
              <label className="form-label">🌍 Country</label>
              <input className="form-input" placeholder="e.g. France…" value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">🎓 University</label>
              <input className="form-input" placeholder="University…" value={filters.university} onChange={(e) => setFilters((f) => ({ ...f, university: e.target.value }))} />
            </div>
          </div>
          <div className="globe-filter-actions">
            <button className="btn btn-ghost btn-sm" onClick={clearAll}><X size={13} /> Clear</button>
            <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
          </div>
        </div>
      )}

      {/* ── Country student panel ── */}
      {selCountry && (
        <div className="globe-user-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <button className="globe-card-close" onClick={() => setSelCountry(null)}><X size={16} /></button>
          <div className="globe-card-header" style={{ marginBottom: 14 }}>
            <div className="globe-card-country-badge" style={{ background: getCountryColor(selCountry.name) }}>{selCountry.name}</div>
            <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{selCountry.users.length} student{selCountry.users.length > 1 ? 's' : ''}</p>
          </div>
          {selCountry.users.map((u) => (
            <div key={u._id} className="globe-mini-student" onClick={() => { setActiveUser(u); setSelCountry(null); }}>
              <div className="avatar avatar-sm" style={{ background: getGrad(u.name), flexShrink: 0 }}>{getInit(u.name)}</div>
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{u.name}</p>
                {u.university && <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{u.university}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── User detail card ── */}
      {activeUser && !selCountry && (
        <div className="globe-user-card">
          <button className="globe-card-close" onClick={() => setActiveUser(null)}><X size={16} /></button>
          <div className="globe-card-header">
            <div className="avatar avatar-lg" style={{ background: getGrad(activeUser.name) }}>{getInit(activeUser.name)}</div>
            <div>
              <h3 className="globe-card-name">{activeUser.name}</h3>
              {activeUser.course && <p className="globe-card-course">{activeUser.course}</p>}
            </div>
          </div>
          <div className="globe-card-meta">
            {activeUser.university && <span className="globe-meta-item"><GraduationCap size={13} />{activeUser.university}</span>}
            {(activeUser.city || activeUser.country) && <span className="globe-meta-item"><MapPin size={13} />{[activeUser.city, activeUser.country].filter(Boolean).join(', ')}</span>}
          </div>
          {activeUser.interests?.length > 0 && (
            <div className="globe-card-tags">{activeUser.interests.slice(0, 4).map((i) => <span key={i} className="tag">{i}</span>)}</div>
          )}
          <div className="globe-card-country-badge" style={{ background: activeUser.color }}>{activeUser.country}</div>
          <div className="globe-card-actions" style={{ marginTop: 14 }}>
            {sentReqs.has(activeUser._id)
              ? <button className="btn btn-secondary" disabled style={{ flex: 1 }}><Users size={14} /> Request Sent</button>
              : <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setConnectTgt(activeUser)}><UserPlus size={14} /> Connect</button>
            }
            <button className="btn btn-ghost globe-msg-btn" onClick={() => navigate('/connections')}><MessageCircle size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && (
        <div className="globe-legend">
          {[...new Set(visibleUsers.map((u) => u.country).filter(Boolean))].slice(0, 10).map((c) => (
            <div key={c} className="globe-legend-item">
              <span className="globe-legend-dot" style={{ background: getCountryColor(c) }} />
              <span>{c}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.66rem' }}>{byCountry.get(normalizeCountryKey(c))?.length ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {connectTgt && (
        <ConnectModal user={connectTgt} onClose={() => setConnectTgt(null)}
          onSuccess={() => { setSentReqs((p) => new Set([...p, connectTgt._id])); setConnectTgt(null); }} />
      )}
    </div>
  );
}
