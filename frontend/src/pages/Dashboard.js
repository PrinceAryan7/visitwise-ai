// frontend/src/pages/Dashboard.js
// AI recommendation banner removed
// Clean explore tab

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import PlaceCard from '../components/PlaceCard';
import Analytics from '../components/Analytics';
import Toast from '../components/Toast';
import ProfileModal from '../components/ProfileModal';
import { getPlaces, getPrediction, geocodeLocation } from '../services/api';

const CATEGORIES = [
  { key:'all',        label:'All',          icon:'🗺️' },
  { key:'tourist',    label:'Tourist',      icon:'🏛️' },
  { key:'mall',       label:'Malls',        icon:'🛍️' },
  { key:'market',     label:'Markets',      icon:'🏪' },
  { key:'cafe',       label:'Cafes',        icon:'☕' },
  { key:'restaurant', label:'Restaurants',  icon:'🍽️' },
  { key:'gym',        label:'Gyms',         icon:'💪' },
  { key:'park',       label:'Parks',        icon:'🌳' },
  { key:'zoo',        label:'Zoos',         icon:'🦁' },
  { key:'bus_stand',  label:'Bus Stands',   icon:'🚌' },
  { key:'airport',    label:'Airports',     icon:'✈️' },
  { key:'cinema',     label:'Cinemas',      icon:'🎬' },
];

const TABS = ['Explore', 'Compare', 'Add Place', 'Analytics'];

function getDistanceKm(la1,lo1,la2,lo2){
  const R=6371,dL=((la2-la1)*Math.PI)/180,dO=((lo2-lo1)*Math.PI)/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(km){ return km<1?`${Math.round(km*1000)} m away`:km<10?`${km.toFixed(1)} km away`:`${Math.round(km)} km away`; }
async function reverseGeo(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,{headers:{'Accept-Language':'en'}});
    const d=await r.json();const a=d.address||{};
    return [a.suburb||a.neighbourhood,a.city||a.town||a.village].filter(Boolean).slice(0,2).join(', ')||'Your Location';
  }catch{return 'Your Location';}
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [places, setPlaces]           = useState([]);
  const [predictions, setPred]        = useState({});
  const [category, setCategory]       = useState('all');
  const [search, setSearch]           = useState('');
  const [toast, setToast]             = useState(null);
  const [userCoords, setUserCoords]   = useState(null);
  const [locationName, setLocName]    = useState('');
  const [locLoading, setLocLoading]   = useState(false);
  const [manualLoc, setManualLoc]     = useState('');
  const [manualLoad, setManualLoad]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [tab, setTab]                 = useState('Explore');
  const [lastUpdated, setLastUpd]     = useState(null);
  const [profileOpen, setProfile]     = useState(false);
  const [mode, setMode]               = useState('idle');
  const [theme, setTheme]             = useState(() => localStorage.getItem('vw_theme') || 'light');
  const refreshRef                    = useRef(null);

  const darkMode = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('vw_theme', theme);
  }, [theme]);

  const showToast=(msg,type='success')=>setToast({message:msg,type});

  const loadPlaces=useCallback(async(cat,q,coords,silent=false)=>{
    if(!silent) setLoading(true);
    try{
      const lat=coords?.lat??userCoords?.lat??null;
      const lng=coords?.lng??userCoords?.lng??null;
      let data=await getPlaces(cat,q,lat,lng);
      if(lat&&lng){
        data=data.map(p=>{
          if(p.latitude&&p.longitude&&!p.distance_km){
            const km=getDistanceKm(lat,lng,parseFloat(p.latitude),parseFloat(p.longitude));
            return{...p,distance_km:km,distance_label:fmtDist(km)};
          }
          return p;
        });
        if(!q) data.sort((a,b)=>(a.distance_km??9999)-(b.distance_km??9999));
      }
      setPlaces(data);
      setLastUpd(new Date());
      const entries=await Promise.all(data.map(p=>getPrediction(p.id,p.category||'mall',p.name||'').then(pred=>[p.id,pred])));
      setPred(Object.fromEntries(entries));
    }catch{
      if(!silent) showToast('Could not load places. Make sure backend is running.','error');
    }finally{
      if(!silent) setLoading(false);
    }
  },[userCoords]);

  useEffect(()=>{
    if(mode==='idle') return;
    refreshRef.current=setInterval(()=>loadPlaces(category,search,userCoords,true),5*60*1000);
    return()=>clearInterval(refreshRef.current);
  },[category,search,userCoords,mode]);

  useEffect(()=>{
    if(search.trim().length===0){
      if(userCoords){setMode('nearby');const t=setTimeout(()=>loadPlaces(category,'',userCoords,false),300);return()=>clearTimeout(t);}
      setPlaces([]);setMode('idle');return;
    }
    setMode('search');
    const t=setTimeout(()=>loadPlaces(category,search,userCoords,false),600);
    return()=>clearTimeout(t);
  },[search,category]);

  const detectLocation=()=>{
    if(!navigator.geolocation){showToast('Geolocation not supported.','error');return;}
    setLocLoading(true);setLocName('Detecting...');
    navigator.geolocation.getCurrentPosition(
      async(pos)=>{
        const coords={lat:pos.coords.latitude,lng:pos.coords.longitude};
        setUserCoords(coords);
        const name=await reverseGeo(coords.lat,coords.lng);
        setLocName(name);setLocLoading(false);setMode('nearby');
        showToast(`📍 ${name} — Loading nearby places...`);
        loadPlaces(category,'',coords,false);
      },
      ()=>{setLocName('');setLocLoading(false);showToast('Location access denied.','error');},
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const handleManualLocation=async(e)=>{
    e.preventDefault();if(!manualLoc.trim()) return;
    setManualLoad(true);
    try{
      const data=await geocodeLocation(manualLoc.trim());
      setUserCoords({lat:data.lat,lng:data.lng});setLocName(data.name);setMode('nearby');
      showToast(`📍 ${data.name} — Loading nearby places...`);
      loadPlaces(category,'',{lat:data.lat,lng:data.lng},false);
      setManualLoc('');
    }catch{showToast('Location not found. Try a different name.','error');}
    finally{setManualLoad(false);}
  };

  const handleCategoryChange=(cat)=>{
    setCategory(cat);
    if(mode!=='idle') loadPlaces(cat,search,userCoords,false);
  };

  const s={
    page:{minHeight:'100vh',background:'var(--page-bg)',fontFamily:"'Inter',sans-serif",color:'var(--text-primary)'},
    nav:{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'0 24px',height:'64px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100},
    navRight:{display:'flex',alignItems:'center',gap:'14px'},
    logo:{fontSize:'20px',fontWeight:'800',color:'var(--text-primary)',letterSpacing:'-0.5px'},
    logoG:{color:'#1D9E75'},
    navTabs:{display:'flex',gap:'4px'},
    navTab:(a)=>({padding:'7px 14px',border:'none',background:a?'rgba(29,158,117,0.12)':'transparent',color:a?'#0f6e56':'var(--text-secondary)',borderRadius:'10px',fontSize:'13px',fontWeight:a?'700':'500',cursor:'pointer'}),
    themeBtn:{padding:'9px 14px',border:'1.5px solid var(--border)',borderRadius:'14px',background:'var(--muted-bg)',color:'var(--text-primary)',fontSize:'13px',fontWeight:'600',cursor:'pointer'},
    avatarBtn:{display:'flex',alignItems:'center',gap:'8px',padding:'6px 12px',borderRadius:'40px',border:'1.5px solid var(--border)',background:'var(--surface)',cursor:'pointer'},
    avatar:{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#1D9E75,#0f6e56)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'13px'},
    main:{maxWidth:'1200px',margin:'0 auto',padding:'24px 20px',width:'100%'},
    grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px'},
    empty:{textAlign:'center',padding:'60px 20px',color:'var(--text-secondary)'},
    inp:{width:'100%',padding:'12px 14px',boxSizing:'border-box',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'14px',outline:'none',background:'var(--input-bg)',color:'var(--text-primary)'},
    btn:{padding:'12px 20px',background:'linear-gradient(135deg,#1D9E75,#0f6e56)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap'},
  };

  const renderIdle=()=>(
    <div style={{background:'linear-gradient(135deg, rgba(29,158,117,0.12), var(--muted-bg))',border:'1.5px solid rgba(29,158,117,0.25)',borderRadius:'20px',padding:'40px 24px',textAlign:'center'}}>
      <div style={{fontSize:'48px',marginBottom:'14px'}}>📍</div>
      <div style={{fontSize:'20px',fontWeight:'800',color:'#0f6e56',marginBottom:'8px'}}>Discover Places Around You</div>
      <div style={{fontSize:'14px',color:'var(--text-secondary)',marginBottom:'28px',lineHeight:1.6}}>
        Use GPS or enter your city. Search malls, markets, bus stands, airports, tourist places & more.
      </div>
      <button onClick={detectLocation} style={{...s.btn,fontSize:'15px',padding:'14px 28px',marginBottom:'20px'}}>📍 Detect My Location (GPS)</button>
      <div style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'12px'}}>— or enter location manually —</div>
      <form onSubmit={handleManualLocation} style={{display:'flex',gap:'8px',maxWidth:'400px',margin:'0 auto 24px'}}>
        <input style={{...s.inp,flex:1}} placeholder="e.g. Patna, Connaught Place..." value={manualLoc} onChange={e=>setManualLoc(e.target.value)}/>
        <button type="submit" style={s.btn} disabled={manualLoad}>{manualLoad?'...':'Go'}</button>
      </form>
      <div style={{fontSize:'12px',color:'var(--text-secondary)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Quick search</div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
        {['India Gate','Patna Zoo','ISBT Delhi','IGI Airport','Chandni Chowk','DLF CyberHub'].map(s=>(
          <button key={s} onClick={()=>setSearch(s)} style={{padding:'7px 14px',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:'20px',fontSize:'13px',color:'var(--text-primary)',cursor:'pointer'}}>{s}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>Visit<span style={s.logoG}>Wise</span> AI</div>
        <div style={s.navRight}>
          <div style={s.navTabs}>
            {TABS.map(t=><button key={t} style={s.navTab(tab===t)} onClick={()=>setTab(t)}>{t}</button>)}
          </div>
          <button style={s.themeBtn} onClick={()=>setTheme(prev=>prev==='dark'?'light':'dark')}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <button style={s.avatarBtn} onClick={()=>setProfile(true)}>
          <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <span style={{fontSize:'14px',fontWeight:'600',color:'var(--text-primary)'}}>{user?.name?.split(' ')[0]}</span>
          <span style={{fontSize:'11px',color:'var(--text-secondary)'}}>▼</span>
        </button>
      </nav>

      <div style={s.main}>

        {tab==='Explore'&&(
          <>
            {/* Search + GPS */}
            <div style={{display:'flex',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
              <div style={{flex:2,minWidth:'200px',position:'relative'}}>
                <span style={{position:'absolute',left:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'16px',pointerEvents:'none'}}>🔍</span>
                <input style={{width:'100%',padding:'13px 18px 13px 46px',boxSizing:'border-box',border:'1.5px solid var(--border)',borderRadius:'14px',fontSize:'14px',outline:'none',background:'var(--surface)',color:'var(--text-primary)'}}
                  placeholder="Search India Gate, Bus Stand, Airport, Mall, Market..."
                  value={search} onChange={e=>setSearch(e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#1D9E75'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
              </div>
              <button style={{padding:'13px 16px',background:userCoords?'#1D9E75':'#1a1a2e',color:'#fff',border:'none',borderRadius:'14px',fontSize:'13px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
                onClick={detectLocation} disabled={locLoading}>
                {locLoading?'⏳ Detecting...':<><span>📍</span>{userCoords?locationName||'Location On':'GPS'}</>}
              </button>
            </div>

            {/* Manual location */}
            <form onSubmit={handleManualLocation} style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
              <div style={{flex:1,position:'relative'}}>
                <span style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',fontSize:'15px',pointerEvents:'none'}}>🏙️</span>
                <input style={{width:'100%',padding:'11px 14px 11px 40px',boxSizing:'border-box',border:'1.5px solid var(--border)',borderRadius:'12px',fontSize:'13px',outline:'none',background:'var(--surface)',color:'var(--text-primary)'}}
                  placeholder="Enter city or area (e.g. Patna, Connaught Place)"
                  value={manualLoc} onChange={e=>setManualLoc(e.target.value)}
                  onFocus={e=>e.target.style.borderColor='#1D9E75'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
              </div>
              <button type="submit" disabled={manualLoad} style={{padding:'11px 20px',background:'#1a1a2e',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'}}>
                {manualLoad?'Searching...':'Set Location'}
              </button>
            </form>

            {userCoords&&locationName&&(
              <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#e8f8f2',color:'#0f6e56',padding:'7px 14px',borderRadius:'40px',fontSize:'13px',fontWeight:'600',marginBottom:'14px',border:'1.5px solid #b7ebd0'}}>
                📍 <strong>{locationName}</strong>
                <span style={{fontSize:'11px',opacity:0.7,fontWeight:'400'}}> · {mode==='nearby'?'Showing nearby places':'Sorted by distance'}</span>
              </div>
            )}

            {/* Category filter */}
            <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
              {CATEGORIES.map(c=>(
                <button key={c.key} style={{padding:'7px 13px',display:'flex',alignItems:'center',gap:'5px',border:'1.5px solid '+(category===c.key?'#1D9E75':'#e8e8e8'),borderRadius:'40px',background:category===c.key?'#e8f8f2':'#fff',color:category===c.key?'#0f6e56':'#666',fontSize:'12px',fontWeight:category===c.key?'700':'500',cursor:'pointer'}}
                  onClick={()=>handleCategoryChange(c.key)}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Result count */}
            {!loading&&places.length>0&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
                <span style={{fontSize:'13px',color:'#aaa'}}>
                  {places.length} {mode==='nearby'?'nearby places':`results for "${search}"`}
                  {userCoords?' · Sorted by distance':''}
                  {lastUpdated?` · ${lastUpdated.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`:''}
                </span>
                <button onClick={()=>loadPlaces(category,search,userCoords,false)} style={{padding:'6px 14px',border:'1.5px solid #e8e8e8',background:'#fff',color:'#888',borderRadius:'20px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>🔄 Refresh</button>
              </div>
            )}

            {/* Places grid — NO banner */}
            {loading?(
              <div style={s.empty}><div style={{fontSize:'36px',marginBottom:'12px'}}>⏳</div><div style={{fontWeight:'600',color:'#888'}}>{mode==='nearby'?'Finding nearby places...':`Searching for "${search}"...`}</div></div>
            ):places.length>0?(
              <div style={s.grid}>{places.map(p=><PlaceCard key={p.id} place={p} prediction={predictions[p.id]}/>)}</div>
            ):renderIdle()}
          </>
        )}

        {tab==='Compare'&&<CompareTab userCoords={userCoords}/>}
        {tab==='Add Place'&&(
          <div style={{maxWidth:'520px',margin:'0 auto'}}>
            <div style={{marginBottom:'20px'}}>
              <h2 style={{fontSize:'20px',fontWeight:'800',color:'#1a1a2e',marginBottom:'6px'}}>Add a New Place</h2>
              <p style={{fontSize:'14px',color:'#888'}}>Add any place missing from search — bus stand, market, tourist spot, restaurant, etc.</p>
            </div>
            <AddPlaceForm onSuccess={(name)=>{showToast(`"${name}" added successfully!`);setTab('Explore');}}/>
          </div>
        )}
        {tab==='Analytics'&&<Analytics userCoords={userCoords}/>}
      </div>

      {profileOpen&&<ProfileModal user={user} onClose={()=>setProfile(false)} onLogout={logout}/>}
      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── Compare Tab ───────────────────────────────────────────
function CompareTab({userCoords}){
  const CATS=[{key:'mall',label:'Malls',icon:'🛍️'},{key:'market',label:'Markets',icon:'🏪'},{key:'cafe',label:'Cafes',icon:'☕'},{key:'restaurant',label:'Restaurants',icon:'🍽️'},{key:'gym',label:'Gyms',icon:'💪'},{key:'park',label:'Parks',icon:'🌳'},{key:'zoo',label:'Zoos',icon:'🦁'},{key:'bus_stand',label:'Bus Stands',icon:'🚌'},{key:'airport',label:'Airports',icon:'✈️'},{key:'cinema',label:'Cinemas',icon:'🎬'},{key:'tourist',label:'Tourist',icon:'🏛️'}];
  const [selCat,setSelCat]=useState('mall');
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const CROWD_COLOR={Low:'#1D9E75',Medium:'#d4a017',High:'#e53935'};
  const CROWD_BG={Low:'#e8f8f2',Medium:'#fef8e8',High:'#fdecea'};

  const load=async(cat)=>{
    setLoading(true);
    try{
      const lat=userCoords?.lat,lng=userCoords?.lng;
      const data=await getPlaces(cat,'',lat,lng);
      const entries=await Promise.all(data.slice(0,12).map(p=>getPrediction(p.id,p.category||cat,p.name||'').then(pred=>[p.id,{...pred,place:p}])));
      setResults(entries.map(([,pred])=>pred).sort((a,b)=>a.crowd_score-b.crowd_score));
    }catch{setResults([]);}
    finally{setLoading(false);}
  };

  useEffect(()=>{load(selCat);},[selCat,userCoords]);

  return(
    <div>
      <h2 style={{fontSize:'20px',fontWeight:'800',color:'#1a1a2e',marginBottom:'6px'}}>Compare Places</h2>
      <p style={{fontSize:'14px',color:'#888',marginBottom:'20px'}}>Compare the place - where exactly is the croud right now?</p>
      <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
        {CATS.map(c=>(
          <button key={c.key} onClick={()=>setSelCat(c.key)} style={{padding:'8px 14px',border:'1.5px solid '+(selCat===c.key?'#1D9E75':'#e8e8e8'),borderRadius:'40px',background:selCat===c.key?'#e8f8f2':'#fff',color:selCat===c.key?'#0f6e56':'#666',fontSize:'13px',fontWeight:selCat===c.key?'700':'500',cursor:'pointer'}}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      {loading?<div style={{textAlign:'center',padding:'40px',color:'#bbb'}}>⏳ Comparing...</div>:
       results.length===0?<div style={{textAlign:'center',padding:'40px',color:'#bbb'}}>No places found. Detect your location first.</div>:(
        <>
          {results[0]&&(
            <div style={{background:'linear-gradient(135deg,#e8f8f2,#f0fdf8)',border:'2px solid #1D9E75',borderRadius:'16px',padding:'16px 20px',marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#1D9E75',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>✅ Best Choice — Least Crowd Right Now</div>
              <div style={{fontWeight:'800',fontSize:'18px',color:'#1a1a2e'}}>{results[0].place?.name}</div>
              <div style={{fontSize:'13px',color:'#888',marginTop:'3px'}}>{results[0].place?.address?.split(',')[0]}</div>
              <div style={{display:'flex',gap:'12px',marginTop:'10px',flexWrap:'wrap'}}>
                <span style={{background:'#e8f8f2',color:'#0f6e56',padding:'4px 12px',borderRadius:'20px',fontSize:'13px',fontWeight:'700'}}>{results[0].crowd_score}% crowd</span>
                <span style={{color:'#888',fontSize:'13px'}}>{results[0].waiting_time} wait</span>
                <span style={{color:'#888',fontSize:'13px'}}>Best time: {results[0].best_time}</span>
              </div>
            </div>
          )}
          <div style={{background:'#fff',borderRadius:'16px',border:'1.5px solid #f0f0f0',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',background:'#f7f8fc',fontSize:'12px',color:'#aaa',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.5px',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'12px'}}>
              <span>Place</span><span>Level</span><span>Wait</span><span>Score</span>
            </div>
            {results.map((r,i)=>(
              <div key={i} style={{padding:'13px 18px',borderBottom:'1px solid #f5f5f5',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'12px',alignItems:'center',background:i===0?'rgba(29,158,117,0.04)':'#fff'}}>
                <div>
                  <div style={{fontWeight:'600',fontSize:'14px',color:'#1a1a2e'}}>{r.place?.name}</div>
                  <div style={{fontSize:'12px',color:'#bbb'}}>{r.place?.address?.split(',')[0]||''}{r.place?.distance_label?` · ${r.place.distance_label}`:''}</div>
                </div>
                <span style={{background:CROWD_BG[r.crowd_level]||'#f0f0f0',color:CROWD_COLOR[r.crowd_level]||'#888',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>{r.crowd_level}</span>
                <span style={{fontSize:'13px',color:'#888',whiteSpace:'nowrap'}}>{r.waiting_time}</span>
                <div style={{width:'50px'}}>
                  <div style={{height:'6px',background:'#f0f0f0',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:CROWD_COLOR[r.crowd_level]||'#888',width:`${r.crowd_score}%`,borderRadius:'4px'}}/>
                  </div>
                  <div style={{fontSize:'11px',color:'#bbb',marginTop:'2px',textAlign:'right'}}>{r.crowd_score}%</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Add Place Form ─────────────────────────────────────────
function AddPlaceForm({onSuccess}){
  const CATS=[
    {value:'mall',label:'Mall'},{value:'cafe',label:'Cafe'},{value:'gym',label:'Gym'},
    {value:'restaurant',label:'Restaurant'},{value:'park',label:'Park'},{value:'zoo',label:'Zoo'},
    {value:'tourist',label:'Tourist Place'},{value:'cinema',label:'Cinema'},
    {value:'bus_stand',label:'Bus Stand'},{value:'airport',label:'Airport'},{value:'market',label:'Market'},
  ];
  const [form,setForm]=useState({name:'',category:'tourist',address:'',latitude:'',longitude:''});
  const [loading,setLoad]=useState(false);
  const [error,setError]=useState('');
  const [locating,setLoc]=useState(false);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  const useGPS=()=>{
    if(!navigator.geolocation) return;setLoc(true);
    navigator.geolocation.getCurrentPosition(pos=>{update('latitude',pos.coords.latitude.toFixed(6));update('longitude',pos.coords.longitude.toFixed(6));setLoc(false);},()=>setLoc(false));
  };
  const handleSubmit=async(e)=>{
    e.preventDefault();if(!form.name.trim()){setError('Place name is required');return;}
    setLoad(true);setError('');
    try{
      const res=await fetch('http://localhost:5000/api/places',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('vw_token')}`},body:JSON.stringify(form)});
      const data=await res.json();if(!res.ok) throw new Error(data.error||'Failed');
      onSuccess(form.name);setForm({name:'',category:'tourist',address:'',latitude:'',longitude:''});
    }catch(err){setError(err.message);}finally{setLoad(false);}
  };
  const inp={width:'100%',padding:'12px 14px',boxSizing:'border-box',border:'1.5px solid var(--border)',borderRadius:'10px',fontSize:'14px',outline:'none',background:'var(--input-bg)',color:'var(--text-primary)',marginBottom:'16px'};
  const lbl={display:'block',fontSize:'12px',fontWeight:'600',color:'var(--text-secondary)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.4px'};
  return(
    <div style={{background:'var(--surface)',borderRadius:'16px',padding:'24px',border:'1.5px solid var(--border)'}}>
      {error&&<div style={{background:'#fdecea',color:'#c0392b',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',marginBottom:'16px'}}>⚠️ {error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={lbl}>Place Name *</label>
        <input style={inp} placeholder="e.g. Mithapur Bus Stand, Select CityWalk Mall" value={form.name} onChange={e=>update('name',e.target.value)} required/>
        <label style={lbl}>Category</label>
        <select style={{...inp,appearance:'none',cursor:'pointer'}} value={form.category} onChange={e=>update('category',e.target.value)}>
          {CATS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label style={lbl}>Address / City</label>
        <input style={inp} placeholder="e.g. Rajpath, New Delhi" value={form.address} onChange={e=>update('address',e.target.value)}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          <div><label style={lbl}>Latitude</label><input style={inp} placeholder="28.6129" value={form.latitude} onChange={e=>update('latitude',e.target.value)} type="number" step="any"/></div>
          <div><label style={lbl}>Longitude</label><input style={inp} placeholder="77.2295" value={form.longitude} onChange={e=>update('longitude',e.target.value)} type="number" step="any"/></div>
        </div>
        <button type="button" onClick={useGPS} disabled={locating} style={{width:'100%',padding:'10px',background:'var(--muted-bg)',border:'1.5px dashed var(--border)',borderRadius:'10px',fontSize:'13px',color:'var(--text-secondary)',cursor:'pointer',marginBottom:'20px'}}>
          {locating?'⏳ Getting location...':'📍 Use My Current GPS Location'}
        </button>
        <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#1D9E75,#0f6e56)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
          {loading?'Adding...':'+ Add Place'}
        </button>
      </form>
    </div>
  );
}
