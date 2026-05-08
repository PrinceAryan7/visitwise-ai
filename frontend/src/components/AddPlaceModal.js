// frontend/src/components/AddPlaceModal.js
import React, { useState } from 'react';
import { addPlace } from '../services/api';

const CATEGORIES = ['mall', 'cafe', 'gym', 'restaurant', 'park', 'cinema'];

export default function AddPlaceModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', category: 'cafe', address: '', latitude: '', longitude: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      update('latitude',  String(pos.coords.latitude.toFixed(6)));
      update('longitude', String(pos.coords.longitude.toFixed(6)));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Place name is required'); return; }
    setLoading(true); setError('');
    try {
      const newPlace = await addPlace(form);
      onAdded(newPlace);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add place. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
    border: '1.5px solid #e8e8e8', borderRadius: '10px',
    fontSize: '14px', outline: 'none', color: '#1a1a2e',
    background: '#fafafa',
  };
  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: '600',
    color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px',
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', padding: '32px',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: 0 }}>Add New Place</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#bbb' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fdecea', color: '#c0392b', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Place Name *</label>
            <input style={inputStyle} placeholder="e.g. Blue Tokai Coffee" value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Category</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.category} onChange={e => update('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} placeholder="e.g. Connaught Place, New Delhi" value={form.address} onChange={e => update('address', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input style={inputStyle} placeholder="28.6139" value={form.latitude} onChange={e => update('latitude', e.target.value)} type="number" step="any" />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input style={inputStyle} placeholder="77.2090" value={form.longitude} onChange={e => update('longitude', e.target.value)} type="number" step="any" />
            </div>
          </div>

          <button type="button" onClick={detectLocation} style={{
            width: '100%', padding: '9px', background: '#f7f8fc',
            border: '1.5px dashed #ddd', borderRadius: '10px',
            fontSize: '13px', color: '#888', cursor: 'pointer', marginBottom: '20px',
          }}>
            📍 Use My Current Location
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '13px', border: '1.5px solid #e8e8e8',
              background: '#fff', color: '#888', borderRadius: '12px', fontSize: '14px', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              flex: 2, padding: '13px',
              background: 'linear-gradient(135deg, #1D9E75, #0f6e56)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            }}>{loading ? 'Adding...' : 'Add Place +'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
