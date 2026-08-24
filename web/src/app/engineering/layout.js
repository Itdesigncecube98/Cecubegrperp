'use client';
import React from 'react';
import EngineeringSidebar from '../../components/EngineeringSidebar';
import { Bell, User, Paintbrush } from 'lucide-react';
import './layout.css';

export default function EngineeringLayout({ children }) {
  return (
    <div className="engineering-layout">
      <EngineeringSidebar />
      <div className="engineering-main">
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
