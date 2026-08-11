'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Trash2, Plus, Target, Edit2 } from 'lucide-react';

// Leaflet must be loaded client-side only
const LocationMap = dynamic(() => import('./LocationMap'), { ssr: false, loading: () => (
  <div style={{ width: '100%', height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: '8px' }}>
    <p style={{ color: '#9ca3af' }}>Loading map...</p>
  </div>
) });

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [coordMode, setCoordMode] = useState('manual'); // 'manual' | 'map'
  const [form, setForm] = useState({
    name: '', address: '', latitude: '', longitude: '',
    radiusMeters: 100, locationType: 'Office'
  });
  const [submitting, setSubmitting] = useState(false);
  const [mapMarker, setMapMarker] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchLocations();
  }, [router]);

  // Parse coords when user types
  useEffect(() => {
    if (coordMode === 'manual' && form.latitude && form.longitude) {
      setMapMarker({ lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) });
    }
  }, [form.latitude, form.longitude, coordMode]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleParseCoordsInput = (value) => {
    // Accept "lat,lng" format like "18.9739398,81.2474048"
    const parts = value.split(',').map(s => s.trim());
    if (parts.length === 2) {
      setForm(prev => ({ ...prev, latitude: parts[0], longitude: parts[1] }));
    }
  };

  const handleLocationSearch = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) { setSearchResults([]); return; }
    // debounce 400ms
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSearchResults(data);
      } catch (e) { setSearchResults([]); }
      setSearching(false);
    }, 400);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const pos = { lat, lng };
    setForm(prev => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng),
      address: prev.address || result.display_name
    }));
    setMapMarker(pos);
    setFlyTo(pos);
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  // Called when user clicks on the map
  const handleMapClick = useCallback((pos) => {
    setMapMarker(pos);
    setForm(prev => ({ ...prev, latitude: String(pos.lat), longitude: String(pos.lng) }));
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      showToast('Name and coordinates are required.', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/locations', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.id) {
        fetchLocations();
        setShowForm(false);
        setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 100, locationType: 'Office' });
        showToast(form.id ? 'GPS Location updated successfully!' : 'GPS Location added successfully!');
      }
    } catch (e) {
      showToast(form.id ? 'Error updating location.' : 'Error adding location.', 'error');
    }
    setSubmitting(false);
  };

  const handleEdit = (loc) => {
    setForm({
      id: loc.id,
      name: loc.name,
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: loc.radiusMeters,
      locationType: loc.locationType || 'Office'
    });
    setCoordMode('manual');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
      fetchLocations();
      showToast('Location deleted.');
    } catch (e) { showToast('Error deleting.', 'error'); }
  };

  const coordsInput = form.latitude && form.longitude ? `${form.latitude},${form.longitude}` : '';

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 500, zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      {showForm ? (
        /* Add Location Form */
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
              ← Back to Locations
            </button>
            <h2 style={{ margin: '8px 0 0', fontSize: '20px', fontWeight: 700 }}>{form.id ? 'Edit GPS Location' : 'New GPS Location'}</h2>
            <div style={{ width: '40px', height: '3px', background: '#f59e0b', borderRadius: '2px', marginTop: '4px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '28px' }}>
            {/* Left - Form */}
            <div>
              {/* Coordinate mode */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" name="coordMode" checked={coordMode === 'map'} onChange={() => setCoordMode('map')} /> Pick coordinates from the map
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" name="coordMode" checked={coordMode === 'manual'} onChange={() => setCoordMode('manual')} /> Enter coordinates manually
                </label>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Location Coordinates*</label>
                <input
                  value={coordsInput}
                  onChange={e => handleParseCoordsInput(e.target.value)}
                  placeholder="18.9739398,81.2474048"
                  style={inputStyle}
                />
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Provide latitude and longitude in the format 18.9739398,81.2474048</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Select a Location Type*</label>
                <select value={form.locationType} onChange={e => setForm(prev => ({ ...prev, locationType: e.target.value }))} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Office">Office</option>
                  <option value="Site">Site</option>
                  <option value="Client">Client</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Enter a Name for this location*</label>
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} placeholder="e.g. Cecube Office Raipur" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelSm}>Address (optional)</label>
                <textarea value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} placeholder="Full address..." />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelSm}>Choose a radius* (distance in meters within the punch is allowed)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="range" min="50" max="2000" step="50" value={form.radiusMeters} onChange={e => setForm(prev => ({ ...prev, radiusMeters: parseInt(e.target.value) }))} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 700, minWidth: '60px', fontSize: '16px' }}>{form.radiusMeters}m</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: '6px', cursor: 'pointer', flex: 1 }}>Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1, fontWeight: 600 }}>
                  {submitting ? 'Saving...' : form.id ? 'Save Changes' : 'Add Location'}
                </button>
              </div>
            </div>

            {/* Right - Map Preview */}
            <div>
              <label style={labelSm}>Place the marker at the location in the map</label>
              <div style={{ marginBottom: '8px', position: 'relative' }}>
                <input
                  placeholder="Search a Location"
                  value={searchQuery}
                  onChange={e => handleLocationSearch(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '0' }}
                />
                {searching && (
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#6b7280' }}>Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectSearchResult(r)}
                        style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        {r.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Interactive Leaflet Map */}
              <div style={{ width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <LocationMap
                  marker={mapMarker}
                  radiusMeters={form.radiusMeters}
                  onMapClick={handleMapClick}
                  flyTo={flyTo}
                />
              </div>
              {mapMarker && (
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                  📍 {mapMarker.lat.toFixed(6)}, {mapMarker.lng.toFixed(6)} — click anywhere on the map to reposition
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Locations List */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={18} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>GPS Location Management</h1>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Manage GPS check-in locations with geofence radius.</p>
            </div>
            <button onClick={() => {
              setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 100, locationType: 'Office' });
              setShowForm(true);
            }} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add GPS Location
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'white', borderRadius: '10px', padding: '18px 24px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <MapPin size={32} color="#007bff" />
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Total Locations</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>{locations.length}</p>
              </div>
            </div>
          </div>

          {loading ? <p>Loading locations...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {locations.map(loc => (
                <div key={loc.id} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MapPin size={22} color="#007bff" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{loc.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{loc.address || 'No address'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(loc)} style={{ background: '#e0f2fe', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                          <Edit2 size={14} color="#0284c7" />
                        </button>
                        <button onClick={() => handleDelete(loc.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                          <Trash2 size={14} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                        📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </span>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        <Target size={10} style={{ display: 'inline', marginRight: '3px' }} />
                        Radius: {loc.radiusMeters}m
                      </span>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        {loc.locationType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                  <MapPin size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 500 }}>No GPS locations added yet.</p>
                  <button onClick={() => setShowForm(true)} style={{ marginTop: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                    Add Your First Location
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const labelSm = { fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
