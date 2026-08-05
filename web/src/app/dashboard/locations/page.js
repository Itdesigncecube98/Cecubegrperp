'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Trash2, Plus, Target } from 'lucide-react';

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

  const handleSubmit = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      showToast('Name and coordinates are required.', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.id) {
        fetchLocations();
        setShowForm(false);
        setForm({ name: '', address: '', latitude: '', longitude: '', radiusMeters: 100, locationType: 'Office' });
        showToast('GPS Location added successfully!');
      }
    } catch (e) {
      showToast('Error adding location.', 'error');
    }
    setSubmitting(false);
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
            <h2 style={{ margin: '8px 0 0', fontSize: '20px', fontWeight: 700 }}>New GPS Location</h2>
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
                  {submitting ? 'Saving...' : 'Add Location'}
                </button>
              </div>
            </div>

            {/* Right - Map Preview */}
            <div>
              <label style={labelSm}>Place the marker at the location in the map</label>
              <div style={{ marginBottom: '8px' }}>
                <input placeholder="Search a Location" style={{ ...inputStyle, marginBottom: '0' }} disabled />
              </div>
              {/* Static Map using OpenStreetMap tiles */}
              <div style={{ width: '100%', height: '380px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                {mapMarker ? (
                  <iframe
                    title="map"
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapMarker.lng - 0.01},${mapMarker.lat - 0.01},${mapMarker.lng + 0.01},${mapMarker.lat + 0.01}&layer=mapnik&marker=${mapMarker.lat},${mapMarker.lng}`}
                  />
                ) : (
                  <>
                    <MapPin size={48} color="#9ca3af" />
                    <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>Enter coordinates to see the location on map</p>
                  </>
                )}
              </div>
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
            <button onClick={() => setShowForm(true)} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                      <button onClick={() => handleDelete(loc.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
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
