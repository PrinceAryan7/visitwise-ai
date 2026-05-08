// frontend/src/components/Toast.js
import React, { useEffect } from 'react';

const CONFIGS = {
  success: { bg: '#0f6e56', icon: '✓' },
  error:   { bg: '#c0392b', icon: '✕' },
  info:    { bg: '#2980b9', icon: 'ℹ' },
};

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const c = CONFIGS[type] || CONFIGS.success;

  return (
    <div style={{
      position: 'fixed', bottom: '30px', left: '50%',
      transform: 'translateX(-50%)',
      background: c.bg, color: '#fff',
      padding: '13px 24px', borderRadius: '40px',
      fontSize: '14px', fontWeight: '600',
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px',
      whiteSpace: 'nowrap', animation: 'toastIn .3s ease',
    }}>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800',
      }}>{c.icon}</span>
      {message}
    </div>
  );
}
