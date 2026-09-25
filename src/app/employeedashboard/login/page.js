'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loginEmployee } from '../../../lib/data';
import { Users, Eye, EyeOff } from 'lucide-react';
import '../../login/login.css'; // Reuse existing login css

export default function EmployeeAppLogin() {
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
    const emp = typeof window !== 'undefined' ? localStorage.getItem('employeeData') : null;
    if (emp) {
      router.replace('/employee/dashboard');
      return;
    }
    generateCaptcha();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaInput !== captchaText) {
      setError('Invalid security code. Please try again.');
      generateCaptcha();
      return;
    }

    try {
      const empData = await loginEmployee(email, password);
      if (empData && empData.success && empData.employee) {
        localStorage.setItem('employeeData', JSON.stringify(empData.employee));
        localStorage.setItem('isMobileApp', 'true');
        router.push('/employee/dashboard');
      } else {
        setError('Invalid employee email or password');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    }
  };

  return (
    <div className="login-container">
      
      <div className="login-card glass-panel">
        <div className="login-logo" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img alt="Cecube Logo" src="/logo.png" style={{ maxWidth: '160px' }} />
        </div>
        
        <div className="login-header">
          <h2>Employee App Login</h2>
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
              placeholder="employee@cecube.com" 
              required 
            />
          </div>

          <div className="input-group password-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
              />
              <button 
                type="button" 
                className="toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group captcha-group">
            <label>Security Code</label>
            <div className="captcha-container">
              <canvas 
                ref={canvasRef} 
                width="160" 
                height="45" 
                className="captcha-canvas"
                onClick={generateCaptcha}
                title="Click to refresh captcha"
              ></canvas>
              <input 
                type="text" 
                value={captchaInput} 
                onChange={(e) => setCaptchaInput(e.target.value)} 
                placeholder="Enter code" 
                required 
                className="captcha-input"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary login-submit">
            Sign In to Dashboard
          </button>
        </form>

      </div>
    </div>
  );
}
