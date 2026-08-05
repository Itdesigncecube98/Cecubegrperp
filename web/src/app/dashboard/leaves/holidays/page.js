'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHolidays, createHoliday, deleteHoliday } from '../../../../lib/data';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public' });
  const router = useRouter();

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminData');
    if (!adminData) {
      router.push('/login/admin');
      return;
    }
    fetchHolidays();
  }, [router]);

  const fetchHolidays = async () => {
    try {
      const data = await getHolidays();
      setHolidays(data);
    } catch (error) {
      console.error("Error fetching holidays", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createHoliday(newHoliday);
      setNewHoliday({ name: '', date: '', type: 'Public' });
      fetchHolidays();
    } catch (error) {
      console.error("Error creating holiday", error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        await deleteHoliday(id);
        fetchHolidays();
      } catch (error) {
        console.error("Error deleting holiday", error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading holidays...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Manage Holidays</h1>
        <button className="back-button" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
      </header>

      <div className="content-grid">
        <div className="form-card">
          <h2>Add New Holiday</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Holiday Name</label>
              <input 
                type="text" 
                required 
                value={newHoliday.name} 
                onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                placeholder="e.g. Diwali, Christmas"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                required 
                value={newHoliday.date} 
                onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select 
                value={newHoliday.type} 
                onChange={(e) => setNewHoliday({...newHoliday, type: e.target.value})}
              >
                <option value="Public">Public Holiday</option>
                <option value="Optional">Optional / Restricted</option>
              </select>
            </div>
            <button type="submit" className="submit-btn">Add Holiday</button>
          </form>
        </div>

        <div className="list-card">
          <h2>Upcoming Holidays</h2>
          <table className="holidays-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => (
                <tr key={h.id}>
                  <td>{new Date(h.date).toLocaleDateString()}</td>
                  <td>{h.name}</td>
                  <td>{h.type}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDelete(h.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">No holidays found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container { padding: 20px; font-family: sans-serif; max-width: 1200px; margin: 0 auto; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .dashboard-header h1 { color: #333; margin: 0; }
        .back-button { padding: 8px 16px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
        .back-button:hover { background-color: #e0e0e0; }
        
        .content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }
        @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }
        
        .form-card, .list-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-card h2, .list-card h2 { margin-top: 0; color: #444; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; font-size: 14px; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
        
        .submit-btn { width: 100%; padding: 12px; background-color: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; font-weight: 600; }
        .submit-btn:hover { background-color: #005bb5; }
        
        .holidays-table { width: 100%; border-collapse: collapse; }
        .holidays-table th, .holidays-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .holidays-table th { background-color: #f8f9fa; font-weight: 600; color: #555; }
        
        .delete-btn { padding: 4px 10px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .delete-btn:hover { background-color: #c82333; }
        
        .text-center { text-align: center; color: #777; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; font-size: 18px; color: #666; }
      `}</style>
    </div>
  );
}
