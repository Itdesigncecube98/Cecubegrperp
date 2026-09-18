'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin, loginEmployee } from '../../lib/data';
import { Shield, Users, Eye, EyeOff } from 'lucide-react';
import './login.css';

export default function Login() {
  const [loginType, setLoginType] = useState('admin'); // 'admin' or 'employee'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Captcha State
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const canvasRef = useRef(null);

  const router = useRouter();

  const drawCaptcha = (text) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Noise lines
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    // Noise dots
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    }

    // Text
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#1e3a8a';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      ctx.translate(20 + (i * 22), canvas.height / 2);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  };

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(captcha);
    setCaptchaInput('');
    setTimeout(() => drawCaptcha(captcha), 0);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaInput !== captchaText) {
      setError('Invalid security code. Please try again.');
      generateCaptcha();
      return;
    }

    if (loginType === 'admin') {
      const adminData = await loginAdmin(email, password);
      if (adminData && adminData.success) {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('adminData', JSON.stringify(adminData));
        localStorage.removeItem('employeeData');
        localStorage.removeItem('isMobileApp');
        router.push('/portal');
      } else {
        setError('Invalid admin email or password');
      }
    } else {
      try {
        const empData = await loginEmployee(email, password);
        if (empData && empData.success && empData.employee) {
          sessionStorage.removeItem('isAdmin');
          sessionStorage.removeItem('adminData');
          localStorage.setItem('employeeData', JSON.stringify(empData.employee));
          localStorage.removeItem('isMobileApp');
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
        <div className="login-logo" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img alt="Cecube Logo" src="/logo.png" style={{ maxWidth: '160px' }} />
        </div>
        
        {/* Admin / Employee Toggle */}
        <div className="login-toggle" style={{ marginBottom: '1.5rem' }}>
          <button 
            type="button"
            className={`toggle-btn ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginType('admin'); setError(''); }}
          >
            <Shield size={16} /> Admin
          </button>
          <button 
            type="button"
            className={`toggle-btn ${loginType === 'employee' ? 'active' : ''}`}
            onClick={() => { setLoginType('employee'); setError(''); }}
          >
            <Users size={16} /> Employee
          </button>
        </div>

        <div className="login-header">
          <h2>{loginType === 'admin' ? 'Admin Login' : 'Employee Login'}</h2>
          <p>
            {loginType === 'admin' 
              ? 'Sign in to access admin dashboard & management modules.' 
              : 'Sign in to access your employee portal & assigned dashboards.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label>{loginType === 'admin' ? 'Admin Email' : 'Employee Email'}</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={loginType === 'admin' ? "admin@cecubeindia.com" : "employee@cecubeindia.com"} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Security Code</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <canvas 
                ref={canvasRef} 
                width="160" 
                height="46" 
                style={{ borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <button 
                type="button" 
                onClick={generateCaptcha}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                Refresh
              </button>
            </div>
            <input 
              type="text" 
              value={captchaInput} 
              onChange={(e) => setCaptchaInput(e.target.value)} 
              placeholder="Enter the 6 characters above" 
              required 
              maxLength={6}
              className="login-input"
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
