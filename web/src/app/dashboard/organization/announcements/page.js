'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../../../lib/data';
import '../../attendance/attendance.css';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ subject: '', message: '', isHoliday: false, date: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.subject) return;
    try {
      await createAnnouncement(newAnnouncement);
      setNewAnnouncement({ subject: '', message: '', isHoliday: false, date: '' });
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
      fetchData();
    }
  };
  return (
    <div className="pageContainer">
      <Link href="/dashboard" className="backLink">
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="tabsContainer" style={{ marginTop: '1rem' }}>
        <div className="tab active" style={{ fontSize: '16px', color: '#111827' }}>Announcements</div>
      </div>

      <div className="card">
        <div className="tableHeaderRow">
          <div>
            <div className="tableTitleArea">
              <h2 className="tableTitle">Announcements</h2>
            </div>
            <p className="tableSubtitle">The below table shows the list of announcements.</p>
          </div>
        </div>

        <div className="tableControls" style={{ justifyContent: 'space-between' }}>
          <div className="entriesControl">
            <select className="entriesSelect"><option>All</option></select>
            entries per page
          </div>
          <div>
            <button className="btn btnPrimary" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} style={{ marginRight: '6px' }} />
              Create Announcement
            </button>
          </div>
        </div>

        {showForm && (
          <div style={{ padding: '1rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>New Announcement</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
              <div className="filterGroup">
                <label className="filterLabel">Subject</label>
                <input type="text" className="filterInput" required value={newAnnouncement.subject} onChange={e => setNewAnnouncement({...newAnnouncement, subject: e.target.value})} placeholder="e.g. Diwali Holiday" />
              </div>
              <div className="filterGroup">
                <label className="filterLabel">Message</label>
                <textarea className="filterInput" rows="3" value={newAnnouncement.message} onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})} placeholder="Optional message..." />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="isHoliday" checked={newAnnouncement.isHoliday} onChange={e => setNewAnnouncement({...newAnnouncement, isHoliday: e.target.checked})} />
                <label htmlFor="isHoliday" style={{ fontSize: '14px', fontWeight: 500 }}>Declare as Holiday</label>
              </div>
              {newAnnouncement.isHoliday && (
                <div className="filterGroup">
                  <label className="filterLabel">Holiday Date</label>
                  <input type="date" className="filterInput" required value={newAnnouncement.date} onChange={e => setNewAnnouncement({...newAnnouncement, date: e.target.value})} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btnPrimary">Post</button>
                <button type="button" className="btn" onClick={() => setShowForm(false)} style={{ background: '#e5e7eb' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="dataTable">
            <thead>
              <tr>
                <th>SUBJECT</th>
                <th>MESSAGE</th>
                <th>HOLIDAY?</th>
                <th>DATE</th>
                <th>SENT AT</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>No announcements found</td>
                </tr>
              ) : (
                announcements.map(ann => (
                  <tr key={ann.id}>
                    <td style={{ fontWeight: 600 }}>{ann.subject}</td>
                    <td>{ann.message || '-'}</td>
                    <td>
                      {ann.isHoliday ? <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>YES</span> : '-'}
                    </td>
                    <td>{ann.date || '-'}</td>
                    <td>{new Date(ann.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => handleDelete(ann.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="paginationArea">
          <div>Showing 1 to {announcements.length} of {announcements.length} entries</div>
          <div className="paginationButtons">
            <button className="pageBtn" disabled>&lsaquo;</button>
            <button className="pageBtn active">1</button>
            <button className="pageBtn" disabled>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
