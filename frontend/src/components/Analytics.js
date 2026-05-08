// frontend/src/components/Analytics.js
import React, { useState, useEffect } from 'react';
import { getPlaces, getPrediction } from '../services/api';

const CAT_ICONS   = { mall: '🛍️', cafe: '☕', gym: '💪', restaurant: '🍽️', park: '🌳', cinema: '🎬' };
const CAT_COLORS  = { mall: '#3a5bd9', cafe: '#d4a017', gym: '#1D9E75', restaurant: '#e74c3c', park: '#27ae60', cinema: '#9b59b6' };
const CROWD_COLOR = { Low: '#1D9E75', Medium: '#d4a017', High: '#e53935' };
const CROWD_BG    = { Low: '#e8f8f2', Medium: '#fef8e8', High: '#fdecea' };
const CROWD_TEXT  = { Low: '#085041', Medium: '#7a4f00', High: '#7a1e1e' };

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function Analytics({ userCoords }) {
  const [places, setPlaces]       = useState([]);
  const [predictions, setPred]    = useState({});
  const [loading, setLoading]     = useState(true);
  const [selectedDay, setDay]     = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load a broad set of places for analytics
        const searches = ['mall', 'cafe', 'gym', 'restaurant'];
        const results  = await Promise.all(searches.map(q => getPlaces('all', q)));
        const all      = results.flat();

        // Deduplicate by name
        const seen  = new Set();
        const unique = all.filter(p => {
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        }).slice(0, 30);

        setPlaces(unique);

        const predEntries = await Promise.all(
          unique.map(p => getPrediction(p.id, p.category || 'mall').then(pred => [p.id, pred]))
        );
        setPred(Object.fromEntries(predEntries));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#bbb' }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>📊</div>
      <div style={{ fontWeight: '600' }}>Loading analytics...</div>
    </div>
  );

  if (places.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#bbb' }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔍</div>
      <div style={{ fontWeight: '600' }}>No data yet</div>
      <div style={{ fontSize: '13px', marginTop: '8px' }}>Search for some places in the Explore tab first</div>
    </div>
  );

  // Stats
  const total    = places.length;
  const lowNow   = places.filter(p => predictions[p.id]?.crowd_level === 'Low').length;
  const medNow   = places.filter(p => predictions[p.id]?.crowd_level === 'Medium').length;
  const highNow  = places.filter(p => predictions[p.id]?.crowd_level === 'High').length;

  // Category breakdown
  const catMap = {};
  places.forEach(p => {
    const cat = p.category || 'mall';
    if (!catMap[cat]) catMap[cat] = { total: 0, low: 0, med: 0, high: 0 };
    catMap[cat].total++;
    const lv = predictions[p.id]?.crowd_level;
    if (lv === 'Low')    catMap[cat].low++;
    if (lv === 'Medium') catMap[cat].med++;
    if (lv === 'High')   catMap[cat].high++;
  });

  // Best to visit now
  const bestNow  = places.filter(p => predictions[p.id]?.crowd_level === 'Low').slice(0, 6);
  const avoidNow = places.filter(p => predictions[p.id]?.crowd_level === 'High').slice(0, 6);

  // Average crowd scores by hour for selected day (across all places)
  const hourlyAvg = Array.from({ length: 24 }, (_, h) => {
    const scores = places.map(p => {
      const pred = predictions[p.id];
      return pred?.crowd_score ?? 0;
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  });

  // Peak hour = hour with highest score
  const peakHour = hourlyAvg.indexOf(Math.max(...hourlyAvg));
  const lowHour  = hourlyAvg.slice(7, 22).indexOf(Math.min(...hourlyAvg.slice(7, 22))) + 7;

  const card = { background: '#fff', borderRadius: '16px', padding: '20px', border: '1.5px solid #f0f0f0', marginBottom: '16px' };

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Places Tracked', value: total,   icon: '📍', color: '#3a5bd9' },
          { label: 'Low Crowd Now',  value: lowNow,  icon: '✅', color: '#1D9E75' },
          { label: 'Medium Crowd',   value: medNow,  icon: '⚠️', color: '#d4a017' },
          { label: 'High Crowd Now', value: highNow, icon: '🔴', color: '#e53935' },
        ].map(s => (
          <div key={s.label} style={{ ...card, marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Best / Avoid now */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={card}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px' }}>✅ Best to Visit Now</h3>
          {bestNow.length === 0
            ? <p style={{ color: '#bbb', fontSize: '13px', margin: 0 }}>No low-crowd places right now</p>
            : bestNow.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>
                    {CAT_ICONS[p.category] || '📍'} {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                    Wait: {predictions[p.id]?.waiting_time ?? 'N/A'} · {predictions[p.id]?.estimated_cost ?? 'N/A'}
                  </div>
                </div>
                <span style={{ background: CROWD_BG.Low, color: CROWD_TEXT.Low, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>Low</span>
              </div>
            ))
          }
        </div>

        <div style={card}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px' }}>🔴 Avoid Right Now</h3>
          {avoidNow.length === 0
            ? <p style={{ color: '#bbb', fontSize: '13px', margin: 0 }}>No high-crowd places right now</p>
            : avoidNow.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>
                    {CAT_ICONS[p.category] || '📍'} {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                    Wait: {predictions[p.id]?.waiting_time ?? 'N/A'}
                  </div>
                </div>
                <span style={{ background: CROWD_BG.High, color: CROWD_TEXT.High, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>High</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Peak insights */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#fff0f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>🔥</div>
          <div style={{ fontSize: '13px', color: '#e53935', fontWeight: '700' }}>Peak Hour Today</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', marginTop: '4px' }}>
            {peakHour}:00 – {peakHour + 1}:00
          </div>
          <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>Most crowded time</div>
        </div>
        <div style={{ background: '#f0fff8', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>😌</div>
          <div style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '700' }}>Best Time Today</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', marginTop: '4px' }}>
            {lowHour}:00 – {lowHour + 1}:00
          </div>
          <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>Least crowded time</div>
        </div>
      </div>

      {/* Category crowd breakdown */}
      <div style={card}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 16px' }}>Crowd by Category — Right Now</h3>
        {Object.entries(catMap).map(([cat, stat]) => (
          <div key={cat} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>
                {CAT_ICONS[cat] || '📍'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{stat.total} places</span>
            </div>
            <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
              {[
                { val: stat.low, color: '#1D9E75' },
                { val: stat.med, color: '#d4a017' },
                { val: stat.high, color: '#e53935' },
              ].map((s, i) => s.val > 0 && (
                <div key={i} style={{ height: '100%', background: s.color, width: `${(s.val / stat.total) * 100}%` }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '5px' }}>
              {[['Low', stat.low, '#1D9E75'], ['Medium', stat.med, '#d4a017'], ['High', stat.high, '#e53935']].map(([l, v, c]) => (
                <span key={l} style={{ fontSize: '11px', color: c, fontWeight: '600' }}>{l}: {v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* All places table */}
      <div style={card}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 16px' }}>All Places — Current Predictions</h3>
        {places.map(p => {
          const pred  = predictions[p.id];
          const crowd = pred?.crowd_level || 'Unknown';
          return (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {CAT_ICONS[p.category] || '📍'} {p.name}
                </div>
                <div style={{ fontSize: '12px', color: '#bbb', marginTop: '2px' }}>
                  Best: {pred?.best_time ?? 'N/A'} · Wait: {pred?.waiting_time ?? 'N/A'} · {pred?.trend ?? ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                <span style={{
                  background: CROWD_BG[crowd] || '#f0f0f0',
                  color: CROWD_TEXT[crowd] || '#888',
                  padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                }}>{crowd}</span>
                <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '600' }}>
                  {pred?.estimated_cost ?? (p.avg_cost > 0 ? `₹${Math.round(p.avg_cost)}` : 'N/A')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
