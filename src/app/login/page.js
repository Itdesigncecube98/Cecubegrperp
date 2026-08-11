'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, loginEmployee } from '../../lib/data';
import { Shield, Users } from 'lucide-react';
import './login.css';

export default function Login() {
  const [loginType, setLoginType] = useState('admin'); // 'admin' or 'employee'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (loginType === 'admin') {
      const adminData = await loginAdmin(email, password);
      if (adminData && adminData.success) {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminData', JSON.stringify(adminData));
        router.push('/dashboard');
      } else {
        setError('Invalid admin email or password');
      }
    } else {
      try {
        const empData = await loginEmployee(email, password);
        if (empData && empData.success && empData.employee) {
          sessionStorage.setItem('employeeData', JSON.stringify(empData.employee));
          router.push('/employee/dashboard');
        } else {
          setError('Invalid employee email or password');
        }
      } catch (err) {
        setError('Failed to login. Please try again.');
      }
    }
  };

  return (
    <div className="login-container">
      
      <div className="login-card glass-panel">
        <div className="login-logo" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="https://www.cecubeindia.com/images/logo.png" alt="Cecube Logo" style={{ maxWidth: '240px' }} />
        </div>
        
        <div className="login-toggle">
          <button 
            className={`toggle-btn ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginType('admin'); setError(''); }}
          >
            <Shield size={16} /> Admin
          </button>
          <button 
            className={`toggle-btn ${loginType === 'employee' ? 'active' : ''}`}
            onClick={() => { setLoginType('employee'); setError(''); }}
          >
            <Users size={16} /> Employee
          </button>
        </div>

        <div className="login-header">
          <h2>Welcome Back!</h2>
          <p>Please enter your details to sign in.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={loginType === 'admin' ? "admin@cecube.com" : "employee@cecube.com"} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>

          <button type="submit" className="btn-primary login-btn">
            Login
          </button>
        </form>
      </div>

    </div>
  );
}
