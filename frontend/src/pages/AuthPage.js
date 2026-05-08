// frontend/src/pages/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode]       = useState('login');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Please enter your name'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        await register(name, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        {[
          { w: 400, h: 400, top: '-10%', left: '-5%', bg: 'rgba(29,158,117,0.08)' },
          { w: 300, h: 300, top: '60%', right: '-5%', bg: 'rgba(29,158,117,0.06)' },
          { w: 200, h: 200, top: '30%', left: '40%', bg: 'rgba(255,255,255,0.03)' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', width: c.w, height: c.h,
            borderRadius: '50%', background: c.bg,
            top: c.top, left: c.left, right: c.right,
            filter: 'blur(40px)',
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1D9E75, #0f6e56)',
            marginBottom: '16px', fontSize: '24px',
          }}>📍</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            Visit<span style={{ color: '#1D9E75' }}>Wise</span> AI
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '6px' }}>
            Smart Crowd & Cost Prediction Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '36px',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
            padding: '4px', marginBottom: '28px',
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '9px',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all .2s',
                background: mode === m ? '#1D9E75' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
              }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.2)', border: '1px solid rgba(192,57,43,0.4)',
              color: '#ff8a80', borderRadius: '10px', padding: '12px 14px',
              fontSize: '13px', marginBottom: '20px',
            }}>⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Full Name
                </label>
                <input
                  type="text" placeholder="John Smith" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={{
                    width: '100%', padding: '13px 16px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', fontSize: '14px', color: '#fff', outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email Address
              </label>
              <input
                type="email" placeholder="john@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{
                  width: '100%', padding: '13px 16px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px', fontSize: '14px', color: '#fff', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password
              </label>
              <input
                type="password" placeholder="••••••••" value={password}
                onChange={e => setPass(e.target.value)} required
                style={{
                  width: '100%', padding: '13px 16px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px', fontSize: '14px', color: '#fff', outline: 'none',
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(29,158,117,0.5)' : 'linear-gradient(135deg, #1D9E75, #0f6e56)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.3px',
            }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ color: '#1D9E75', cursor: 'pointer', fontWeight: '600' }}
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
