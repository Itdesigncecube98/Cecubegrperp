import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const isAdmin = sessionStorage.getItem('isAdmin');

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
