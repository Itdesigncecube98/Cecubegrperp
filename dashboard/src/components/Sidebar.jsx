import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, LogOut } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-box">C</div>
        <h2>Cecube</h2>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/dashboard/employees" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <Users size={20} />
          <span>Employees</span>
        </NavLink>
        <NavLink to="/dashboard/attendance" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
          <CalendarCheck size={20} />
          <span>Attendance</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="btn-outline nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
