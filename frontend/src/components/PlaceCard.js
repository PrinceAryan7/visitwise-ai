// frontend/src/components/PlaceCard.js
import React from 'react';

const CROWD_CONFIG = {
  Low:    { bg:'#e8f8f2', text:'#085041', dot:'#1D9E75', bar:25 },
  Medium: { bg:'#fef8e8', text:'#7a4f00', dot:'#d4a017', bar:60 },
  High:   { bg:'#fdecea', text:'#7a1e1e', dot:'#e53935', bar:90 },
  Unknown:{ bg:'#f4f5f7', text:'#555',    dot:'#aaa',    bar:0  },
};

const CATEGORY_ICONS  = { mall:'🛍️', cafe:'☕', gym:'💪', restaurant:'🍽️', park:'🌳', zoo:'🦁', cinema:'🎬', tourist:'🏛️' };
const CATEGORY_LABELS = { mall:'Mall', cafe:'Cafe', gym:'Gym', restaurant:'Restaurant', park:'Park', zoo:'Zoo', cinema:'Cinema', tourist:'Tourist Place' };

export default function PlaceCard({ place, prediction }) {
  const crowd  = prediction?.crowd_level || 'Unknown';
  const config = CROWD_CONFIG[crowd] || CROWD_CONFIG.Unknown;
  const score  = prediction?.crowd_score ?? 0;
  const isHigh = prediction?.confidence === 'high';

  return (
    <div style={{ background:'var(--surface)', borderRadius:'20px', padding:'20px', border:'1.5px solid var(--border)', boxShadow:'0 2px 16px rgba(0,0,0,0.08)', transition:'box-shadow .2s' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1, minWidth:0 }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'var(--muted-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
            {CATEGORY_ICONS[place.category] || '📍'}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:'700', fontSize:'15px', color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {place.name}
            </div>
            <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' }}>
              {CATEGORY_LABELS[place.category] || place.category}
              {place.address ? ` · ${place.address.split(',')[0]}` : ''}
            </div>
          </div>
        </div>
        {/* Crowd badge */}
        <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 11px', borderRadius:'20px', background:config.bg, color:config.text, fontSize:'12px', fontWeight:'700', flexShrink:0, marginLeft:'8px' }}>
          <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:config.dot, display:'inline-block' }}/>
          {crowd}
        </div>
      </div>

      {/* Distance + Open status row */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
        {place.distance_label && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#f0f4ff', color:'#3a5bd9', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', border:'1px solid #d8e0ff' }}>
            🗺️ {place.distance_label}
          </div>
        )}
        {prediction?.open_status && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background: prediction.open_status==='Open'||prediction.open_status?.startsWith('Open until') ? '#e8f8f2' : '#fdecea', color: prediction.open_status==='Open'||prediction.open_status?.startsWith('Open until') ? '#0f6e56' : '#c0392b', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>
            {prediction.open_status==='Open'||prediction.open_status?.startsWith('Open until') ? '🟢' : '🔴'} {prediction.open_status}
          </div>
        )}
      </div>

      {/* Crowd bar */}
      <div style={{ marginBottom:'12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
          <span style={{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>Crowd Level</span>
          <span style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{prediction?.active_users ?? 0} people · {score}%</span>
        </div>
        <div style={{ height:'8px', background:'#f0f0f0', borderRadius:'6px', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:'6px', background:config.dot, width:`${score}%`, transition:'width .6s ease' }}/>
        </div>
      </div>

      {/* Trend */}
      {prediction?.trend && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'var(--text-secondary)', marginBottom:'12px', background:'var(--muted-bg)', padding:'4px 10px', borderRadius:'20px' }}>
          {prediction.trend}
        </div>
      )}

      {/* Metrics */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
        {[
          { label:'Wait Time', value:prediction?.waiting_time   ?? 'N/A', icon:'⏱️' },
          { label:'Avg Cost',  value:prediction?.estimated_cost ?? 'N/A', icon:'💰' },
          { label:'Best Time', value:prediction?.best_time      ?? 'N/A', icon:'🕐' },
        ].map(m=>(
          <div key={m.label} style={{ background:'#f7f8fc', borderRadius:'12px', padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:'16px', marginBottom:'3px' }}>{m.icon}</div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.value}</div>
            <div style={{ fontSize:'10px', color:'var(--text-secondary)', marginTop:'2px', textTransform:'uppercase', letterSpacing:'0.4px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div style={{ marginTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'11px', color: isHigh ? '#1D9E75' : '#d4a017', fontWeight:'600' }}>
          {isHigh ? '✓ High accuracy prediction' : '~ Based on general patterns'}
        </span>
        <span style={{ fontSize:'10px', color:'#ccc' }}>🤖 AI</span>
      </div>
    </div>
  );
}
