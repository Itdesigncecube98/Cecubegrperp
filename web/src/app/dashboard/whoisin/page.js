'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Map, List, Search, MapPin, RefreshCw } from 'lucide-react';

export default function WhoIsInPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [journeyMapView, setJourneyMapView] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) { router.push('/login/admin'); return; }
    fetchData();
  }, [router, dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?date=${dateFilter}`)
      ]);
      const emps = await empRes.json();
      const atts = await attRes.json();
      setEmployees(emps);
      setAttendance(atts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getStatus = (empId) => {
    const rec = attendance.find(a => a.employee?.id === empId || a.employeeId === empId);
    if (!rec) return 'Not Started';
    if (rec.status === 'Present') return 'IN';
    if (rec.status === 'Absent') return 'OUT';
    return 'Not Started';
  };

  const filteredEmps = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getStatus(e.id);
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inCount = employees.filter(e => getStatus(e.id) === 'IN').length;
  const outCount = employees.filter(e => getStatus(e.id) === 'OUT').length;
  const notStarted = employees.filter(e => getStatus(e.id) === 'Not Started').length;

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      {/* Filter Bar */}
      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelSm}>Organization</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 10px', background: 'white', minWidth: '220px', fontSize: '14px', gap: '6px' }}>
              Cecube Engineering India Pvt Lt...
              <span style={{ marginLeft: 'auto', color: '#9ca3af', cursor: 'pointer' }}>× ▾</span>
            </div>
          </div>
          <div>
            <label style={labelSm}>Date</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white' }} />
          </div>
          <div>
            <label style={labelSm}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', background: 'white', minWidth: '140px' }}>
              <option value="All">All</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>
          <button style={{ padding: '8px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>View</button>
          <button onClick={() => { setStatusFilter('All'); setSearchQuery(''); setDateFilter(new Date().toISOString().split('T')[0]); }} style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Clear</button>
          <button style={{ marginLeft: 'auto', padding: '8px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>More Filters</button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', count: employees.length, color: '#374151', bg: '#f3f4f6' },
            { label: 'IN', count: inCount, color: '#166534', bg: '#dcfce7' },
            { label: 'OUT', count: outCount, color: '#991b1b', bg: '#fee2e2' },
            { label: 'Not Started', count: notStarted, color: '#92400e', bg: '#fef3c7' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.count}</span>
              <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>{s.label}</span>
            </div>
          ))}
          <button onClick={fetchData} style={{ marginLeft: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Journey Map View Toggle */}
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Toggle Switch */}
            <div onClick={() => setJourneyMapView(!journeyMapView)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: journeyMapView ? '#007bff' : '#d1d5db', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer', transition: '0.2s', position: 'relative' }}>
              {journeyMapView && <div style={{ position: 'absolute', left: '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '8px' }}>✓</span></div>}
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', marginLeft: journeyMapView ? 'auto' : '0', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: journeyMapView ? '#007bff' : '#374151' }}>Journey Map View</span>
          </div>

          {journeyMapView ? (
            /* Journey Map View Layout */
            <div style={{ display: 'flex', minHeight: '400px' }}>
              {/* Left - Employee List */}
              <div style={{ width: '260px', borderRight: '1px solid #f3f4f6', flexShrink: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px', background: '#fafafa' }}>
                    <Search size={14} color="#9ca3af" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search members by name" style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', flex: 1 }} />
                  </div>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '480px' }}>
                  {filteredEmps.map(emp => {
                    const status = getStatus(emp.id);
                    const isSelected = selectedEmployee?.id === emp.id;
                    return (
                      <div key={emp.id} onClick={() => setSelectedEmployee(emp)} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: isSelected ? '#eff6ff' : 'white', borderLeft: isSelected ? '3px solid #007bff' : '3px solid transparent' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400, color: '#111827' }}>{emp.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: status === 'IN' ? '#dcfce7' : status === 'OUT' ? '#fee2e2' : '#fef3c7', color: status === 'IN' ? '#166534' : status === 'OUT' ? '#991b1b' : '#92400e' }}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                  {filteredEmps.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No employees found</div>}
                </div>
              </div>

              {/* Right - Journey/Map Panel */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', background: '#fafafa', padding: '40px' }}>
                {selectedEmployee ? (
                  <>
                    <MapPin size={48} color="#d1d5db" />
                    <p style={{ color: '#9ca3af', fontSize: '15px', fontWeight: 500, textAlign: 'center' }}>No Journey found for this employee.</p>
                    <p style={{ color: '#c4c4c4', fontSize: '13px' }}>GPS punch data will appear here when available.</p>
                  </>
                ) : (
                  <>
                    <Map size={48} color="#d1d5db" />
                    <p style={{ color: '#9ca3af', fontSize: '15px', fontWeight: 500 }}>Select an employee to view their journey</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Regular List View */
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px', background: '#fafafa', maxWidth: '260px' }}>
                  <Search size={14} color="#9ca3af" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search members by name" style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', flex: 1 }} />
                </div>
              </div>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
              ) : filteredEmps.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No employees found</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', padding: '16px 20px' }}>
                  {filteredEmps.map(emp => {
                    const status = getStatus(emp.id);
                    return (
                      <div key={emp.id} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.department}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', flexShrink: 0, background: status === 'IN' ? '#dcfce7' : status === 'OUT' ? '#fee2e2' : '#fef3c7', color: status === 'IN' ? '#166534' : status === 'OUT' ? '#991b1b' : '#92400e' }}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelSm = { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' };
