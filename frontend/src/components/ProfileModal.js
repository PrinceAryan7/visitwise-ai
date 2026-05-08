// frontend/src/components/ProfileModal.js
import React from 'react';

export default function ProfileModal({ user, onClose, onLogout }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        zIndex: 1000, padding: '70px 24px 0',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: '20px', padding: '0',
        width: '300px', boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
        overflow: 'hidden', animation: 'dropIn .2s ease',
      }}>
        <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1D9E75, #0f6e56)',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: '800', color: '#fff',
            margin: '0 auto 12px',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>{user?.name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>{user?.email}</div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px' }}>
          {[
            { icon: '📅', label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Today' },
            { icon: '✅', label: 'Account Status', value: 'Active' },
            { icon: '🔒', label: 'Account Type',   value: 'Standard User' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              background: 'var(--muted-bg)', marginBottom: '8px',
            }}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            </div>
          ))}

          {/* Sign out */}
          <button
            onClick={() => { onClose(); onLogout(); }}
            style={{
              width: '100%', padding: '12px', marginTop: '8px',
              background: '#fdecea', color: '#c0392b',
              border: '1.5px solid #fcd5d2', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
