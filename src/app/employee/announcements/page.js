'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, Calendar, Info } from 'lucide-react';
import { getAnnouncements } from '../../../lib/data';


export default function EmployeeAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 2.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/employee/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 600, fontSize: '14px', marginBottom: '1.5rem', transition: 'color 0.2s' }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem' }}>
        <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
          <Bell size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Company Announcements</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>Stay updated with the latest news and holidays</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Info size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: '#334155', fontSize: '18px', fontWeight: 600 }}>No Announcements</h3>
          <p style={{ color: '#64748b', marginTop: '8px' }}>There are no recent announcements to display right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
          {announcements.map(ann => (
            <div key={ann.id} style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              border: ann.isHoliday ? '1px solid #bbf7d0' : '1px solid #e2e8f0', 
              padding: '1.75rem', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Top Accent Line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: ann.isHoliday ? '#22c55e' : '#3b82f6' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 700, lineHeight: 1.3 }}>{ann.subject}</h3>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Posted on {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                
                {ann.isHoliday && (
                  <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
                    HOLIDAY
                  </span>
                )}
              </div>
              
              {ann.message && (
                <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '14px', lineHeight: 1.6, flex: 1 }}>
                  {ann.message}
                </p>
              )}
              
              {ann.isHoliday && ann.date && (
                <div style={{ background: '#f0fdf4', border: '1px dashed #bbf7d0', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
                  <Calendar size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Holiday Date</div>
                    <div style={{ fontSize: '14px', color: '#166534', fontWeight: 600 }}>{new Date(ann.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
