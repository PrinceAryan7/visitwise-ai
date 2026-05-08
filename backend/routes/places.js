// backend/routes/places.js
// FIXED: Strict category detection — only real malls in mall, etc.

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const axios   = require('axios');
require('dotenv').config();

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(k){ const e=cache.get(k); if(!e) return null; if(Date.now()-e.ts>CACHE_TTL){cache.delete(k);return null;} return e.data; }
function setCache(k,d){ cache.set(k,{data:d,ts:Date.now()}); }

function dedupe(arr){
  const seen=new Set();
  return arr.filter(p=>{ const k=p.name.toLowerCase().trim(); if(seen.has(k)) return false; seen.add(k); return true; });
}

const GENERIC=new Set(['patna','delhi','mumbai','kolkata','bihar','india','bengaluru','pune','chennai','hyderabad','jaipur','lucknow','agra','city','town','village','panama','gurgaon','noida','faridabad','gurugram','state','district']);
function isValidName(n){ return n&&n.trim().length>3&&!GENERIC.has(n.toLowerCase().trim()); }
function isInIndia(lat,lng){ const la=parseFloat(lat),lo=parseFloat(lng); if(isNaN(la)||isNaN(lo)) return true; return la>=6&&la<=37&&lo>=68&&lo<=98; }

function haversine(la1,lo1,la2,lo2){
  const R=6371,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(km){ if(km<1) return `${Math.round(km*1000)} m away`; if(km<10) return `${km.toFixed(1)} km away`; return `${Math.round(km)} km away`; }
function withDist(p,lat,lng){
  if(!lat||!lng||!p.latitude||!p.longitude) return p;
  const km=haversine(parseFloat(lat),parseFloat(lng),parseFloat(p.latitude),parseFloat(p.longitude));
  return {...p,distance_km:km,distance_label:fmtDist(km)};
}

// ═══════════════════════════════════════════════════════════
// STRICT CATEGORY DETECTION
// Only assign a category if we are SURE about it
// Unknown places return null → filtered out from search
// ═══════════════════════════════════════════════════════════
function guessCategory(tags={}, type='', displayName='') {
  const amenity = (tags.amenity || '').toLowerCase();
  const shop    = (tags.shop    || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();
  const historic= (tags.historic|| '').toLowerCase();
  const name    = (tags.name    || displayName || '').toLowerCase();
  const cls     = (type         || '').toLowerCase();

  // ── Bus Stand / Transport ────────────────────────────────
  if (amenity==='bus_station'||amenity==='bus_stop'||cls==='bus_stop'||
      name.includes('bus stand')||name.includes('bus terminal')||
      name.includes('bus station')||name.includes('isbt')||name.includes('bus depot'))
    return 'bus_stand';

  // ── Airport ──────────────────────────────────────────────
  if (amenity==='aerodrome'||tourism==='aerodrome'||cls==='aerodrome'||
      name.includes('airport')||name.includes('aerodrome')||name.includes('air terminal'))
    return 'airport';

  // ── Cafe ─────────────────────────────────────────────────
  if (amenity==='cafe'||amenity==='coffee_shop'||
      shop==='coffee'||shop==='bakery'||shop==='tea'||
      name.includes('cafe')||name.includes('coffee')||
      name.includes('chai')||name.includes('bakery')||name.includes('patisserie'))
    return 'cafe';

  // ── Gym / Fitness ────────────────────────────────────────
  if (amenity==='gym'||amenity==='fitness_centre'||amenity==='sports_centre'||
      leisure==='fitness_centre'||leisure==='sports_centre'||leisure==='gym'||
      name.includes('gym')||name.includes('fitness')||name.includes('yoga centre')||
      name.includes('crossfit')||name.includes('health club'))
    return 'gym';

  // ── Restaurant / Food ────────────────────────────────────
  if (amenity==='restaurant'||amenity==='fast_food'||amenity==='food_court'||
      amenity==='bar'||amenity==='pub'||amenity==='biryani_restaurant'||
      name.includes('restaurant')||name.includes('dhaba')||name.includes('biryani')||
      name.includes('pizza')||name.includes('burger')||name.includes('diner')||
      name.includes('eatery')||name.includes('food court')||name.includes('canteen'))
    return 'restaurant';

  // ── Mall / Shopping Centre ───────────────────────────────
  // STRICT: only actual malls/shopping centres
  if (shop==='mall'||shop==='shopping_centre'||shop==='department_store'||
      amenity==='marketplace'||
      name.includes(' mall')||name.includes('shopping mall')||
      name.includes('shopping centre')||name.includes('shopping center')||
      name.includes('city walk')||name.includes('citywalk')||
      name.includes('cyberhub')||name.includes('cyber hub'))
    return 'mall';

  // ── Zoo / Wildlife ───────────────────────────────────────
  if (tourism==='zoo'||amenity==='zoo'||leisure==='zoo'||
      name.includes('zoo')||name.includes('zoological')||
      name.includes('safari park')||name.includes('aquarium')||
      name.includes('wildlife park')||name.includes('biological park'))
    return 'zoo';

  // ── Park / Garden ────────────────────────────────────────
  if (leisure==='park'||leisure==='garden'||leisure==='nature_reserve'||
      leisure==='recreation_ground'||amenity==='park'||
      name.includes(' park')||name.includes('garden')||name.includes('maidan')||
      name.includes('udyan')||name.includes('vatika')||name.includes(' bagh')||
      name.includes('botanical')||name.includes('national park'))
    return 'park';

  // ── Cinema ───────────────────────────────────────────────
  if (amenity==='cinema'||leisure==='cinema'||
      name.includes('cinema')||name.includes('pvr')||
      name.includes('inox')||name.includes('multiplex')||name.includes('theatre')||
      name.includes('movie'))
    return 'cinema';

  // ── Market / Bazaar ──────────────────────────────────────
  if (amenity==='marketplace'||shop==='marketplace'||
      name.includes(' market')||name.includes('bazaar')||
      name.includes('mandi')||name.includes('haat')||
      name.includes('sarojini')||name.includes('karol bagh')||
      name.includes('lajpat')||name.includes('connaught place')||
      name.includes('chandni chowk')||name.includes('crawford market')||
      name.includes('linking road'))
    return 'market';

  // ── Tourist / Monuments ──────────────────────────────────
  if (['monument','museum','attraction','viewpoint','gallery',
       'castle','fort','temple','mosque','church','shrine','palace',
       'archaeological_site','artwork','heritage'].includes(tourism)||
      ['monument','ruins','fort','temple','castle'].includes(historic)||
      name.includes(' gate')|| name.includes(' fort')||name.includes('palace')||
      name.includes('temple')||name.includes('mandir')||name.includes('masjid')||
      name.includes('church')||name.includes('museum')||name.includes('monument')||
      name.includes('memorial')||name.includes('ghat')||name.includes('heritage')||
      name.includes('archaeological')||name.includes('stupa')||name.includes('shrine')||
      name.includes('dargah')||name.includes('gurudwara')||name.includes('ashram')||
      name.includes('beach')||name.includes('waterfall')||name.includes('cave')||
      name.includes('lake')||name.includes('dam'))
    return 'tourist';

  // ── UNKNOWN — return null, don't force a wrong category ──
  return null;
}

// ═══════════════════════════════════════════════════════════
// FAMOUS PLACES with exact coordinates
// ═══════════════════════════════════════════════════════════
const FAMOUS_PLACES = [
  // Tourist
  {name:"India Gate",category:"tourist",address:"Rajpath, New Delhi",latitude:28.6129,longitude:77.2295},
  {name:"Taj Mahal",category:"tourist",address:"Agra, Uttar Pradesh",latitude:27.1751,longitude:78.0421},
  {name:"Red Fort",category:"tourist",address:"Chandni Chowk, New Delhi",latitude:28.6562,longitude:77.2410},
  {name:"Qutub Minar",category:"tourist",address:"Mehrauli, New Delhi",latitude:28.5245,longitude:77.1855},
  {name:"Lotus Temple",category:"tourist",address:"Bahapur, New Delhi",latitude:28.5535,longitude:77.2588},
  {name:"Humayun Tomb",category:"tourist",address:"Nizamuddin, New Delhi",latitude:28.5933,longitude:77.2507},
  {name:"Akshardham Temple",category:"tourist",address:"Noida Mor, New Delhi",latitude:28.6127,longitude:77.2773},
  {name:"Gateway of India",category:"tourist",address:"Apollo Bandar, Mumbai",latitude:18.9220,longitude:72.8347},
  {name:"Hawa Mahal",category:"tourist",address:"Jaipur, Rajasthan",latitude:26.9239,longitude:75.8267},
  {name:"Amber Fort",category:"tourist",address:"Amer, Jaipur, Rajasthan",latitude:26.9855,longitude:75.8513},
  {name:"Charminar",category:"tourist",address:"Hyderabad, Telangana",latitude:17.3616,longitude:78.4747},
  {name:"Mysore Palace",category:"tourist",address:"Mysuru, Karnataka",latitude:12.3052,longitude:76.6552},
  {name:"Golden Temple",category:"tourist",address:"Amritsar, Punjab",latitude:31.6200,longitude:74.8765},
  {name:"Varanasi Ghats",category:"tourist",address:"Varanasi, Uttar Pradesh",latitude:25.3176,longitude:83.0134},
  {name:"Victoria Memorial",category:"tourist",address:"Kolkata, West Bengal",latitude:22.5448,longitude:88.3426},
  {name:"Howrah Bridge",category:"tourist",address:"Howrah, Kolkata",latitude:22.5850,longitude:88.3468},
  {name:"Meenakshi Temple",category:"tourist",address:"Madurai, Tamil Nadu",latitude:9.9195,longitude:78.1193},
  {name:"Marine Drive Mumbai",category:"tourist",address:"Marine Drive, Mumbai",latitude:18.9432,longitude:72.8232},
  {name:"Juhu Beach",category:"tourist",address:"Juhu, Mumbai",latitude:19.0883,longitude:72.8264},
  {name:"Marina Beach",category:"tourist",address:"Chennai, Tamil Nadu",latitude:13.0500,longitude:80.2824},
  {name:"Calangute Beach",category:"tourist",address:"Calangute, Goa",latitude:15.5435,longitude:73.7517},
  {name:"Baga Beach",category:"tourist",address:"Baga, Goa",latitude:15.5569,longitude:73.7520},
  {name:"Rock Garden Chandigarh",category:"tourist",address:"Chandigarh",latitude:30.7493,longitude:76.8020},
  {name:"Rishikesh",category:"tourist",address:"Rishikesh, Uttarakhand",latitude:30.0869,longitude:78.2676},
  // Zoos
  {name:"Patna Zoo",category:"zoo",address:"Bailey Road, Patna, Bihar",latitude:25.6093,longitude:85.1376},
  {name:"Delhi Zoo",category:"zoo",address:"Mathura Road, New Delhi",latitude:28.6003,longitude:77.2477},
  {name:"Mysore Zoo",category:"zoo",address:"Mysuru, Karnataka",latitude:12.2958,longitude:76.6394},
  {name:"Alipore Zoo",category:"zoo",address:"Kolkata, West Bengal",latitude:22.5355,longitude:88.3334},
  {name:"Nehru Zoological Park",category:"zoo",address:"Hyderabad, Telangana",latitude:17.3491,longitude:78.4514},
  {name:"Bannerghatta Biological Park",category:"zoo",address:"Bengaluru, Karnataka",latitude:12.8002,longitude:77.5788},
  {name:"Arignar Anna Zoological Park",category:"zoo",address:"Vandalur, Chennai",latitude:12.8886,longitude:80.0842},
  // Parks
  {name:"Lodhi Garden",category:"park",address:"Lodhi Road, New Delhi",latitude:28.5931,longitude:77.2197},
  {name:"Cubbon Park",category:"park",address:"Bengaluru, Karnataka",latitude:12.9763,longitude:77.5929},
  {name:"Lalbagh Botanical Garden",category:"park",address:"Bengaluru, Karnataka",latitude:12.9507,longitude:77.5848},
  {name:"Eco Park Kolkata",category:"park",address:"New Town, Kolkata",latitude:22.5880,longitude:88.4785},
  {name:"Sanjay Gandhi National Park",category:"park",address:"Borivali, Mumbai",latitude:19.2147,longitude:72.9106},
  {name:"Nehru Park Delhi",category:"park",address:"Chanakyapuri, New Delhi",latitude:28.5989,longitude:77.1904},
  {name:"Sukhna Lake",category:"park",address:"Chandigarh",latitude:30.7423,longitude:76.8182},
  // Malls
  {name:"Select CityWalk Mall",category:"mall",address:"Saket, New Delhi",latitude:28.5279,longitude:77.2170},
  {name:"Ambience Mall Gurugram",category:"mall",address:"DLF Phase 3, Gurugram",latitude:28.5000,longitude:77.0950},
  {name:"DLF CyberHub",category:"mall",address:"DLF Cyber City, Gurugram",latitude:28.4950,longitude:77.0882},
  {name:"Phoenix Palassio",category:"mall",address:"Gomti Nagar, Lucknow",latitude:26.8631,longitude:80.9462},
  {name:"Lulu Mall Lucknow",category:"mall",address:"Amar Shaheed Path, Lucknow",latitude:26.8469,longitude:80.9462},
  {name:"Forum Mall Bengaluru",category:"mall",address:"Koramangala, Bengaluru",latitude:12.9352,longitude:77.6120},
  {name:"Quest Mall Kolkata",category:"mall",address:"Park Street, Kolkata",latitude:22.5508,longitude:88.3562},
  {name:"Phoenix Marketcity Mumbai",category:"mall",address:"Kurla, Mumbai",latitude:19.0864,longitude:72.8891},
  {name:"Inorbit Mall Mumbai",category:"mall",address:"Malad, Mumbai",latitude:19.1870,longitude:72.8408},
  {name:"VR Mall Chennai",category:"mall",address:"Anna Nagar, Chennai",latitude:13.0852,longitude:80.2105},
  {name:"Elante Mall Chandigarh",category:"mall",address:"Industrial Area, Chandigarh",latitude:30.7060,longitude:76.8017},
  // Bus Stands
  {name:"ISBT Kashmere Gate",category:"bus_stand",address:"Kashmere Gate, New Delhi",latitude:28.6676,longitude:77.2290},
  {name:"ISBT Anand Vihar",category:"bus_stand",address:"Anand Vihar, New Delhi",latitude:28.6472,longitude:77.3158},
  {name:"Mithapur Bus Stand Patna",category:"bus_stand",address:"Mithapur, Patna, Bihar",latitude:25.6080,longitude:85.1412},
  {name:"Gandhi Maidan Bus Stand",category:"bus_stand",address:"Gandhi Maidan, Patna, Bihar",latitude:25.6115,longitude:85.1409},
  {name:"Majestic Bus Stand",category:"bus_stand",address:"Kempegowda, Bengaluru",latitude:12.9767,longitude:77.5713},
  {name:"Mumbai Central Bus Terminal",category:"bus_stand",address:"Mumbai Central, Mumbai",latitude:18.9686,longitude:72.8192},
  {name:"Koyambedu Bus Terminus",category:"bus_stand",address:"Koyambedu, Chennai",latitude:13.0694,longitude:80.1948},
  // Airports
  {name:"Indira Gandhi International Airport",category:"airport",address:"New Delhi",latitude:28.5562,longitude:77.1000},
  {name:"Chhatrapati Shivaji International Airport",category:"airport",address:"Mumbai",latitude:19.0896,longitude:72.8656},
  {name:"Kempegowda International Airport",category:"airport",address:"Bengaluru",latitude:13.1986,longitude:77.7066},
  {name:"Jay Prakash Narayan Airport Patna",category:"airport",address:"Patna, Bihar",latitude:25.5913,longitude:85.0872},
  {name:"Netaji Subhas Chandra Bose Airport",category:"airport",address:"Kolkata",latitude:22.6549,longitude:88.4467},
  {name:"Chennai International Airport",category:"airport",address:"Chennai",latitude:12.9941,longitude:80.1709},
  {name:"Rajiv Gandhi International Airport",category:"airport",address:"Hyderabad",latitude:17.2403,longitude:78.4294},
  // Markets
  {name:"Connaught Place",category:"market",address:"New Delhi",latitude:28.6315,longitude:77.2167},
  {name:"Chandni Chowk Market",category:"market",address:"Old Delhi, New Delhi",latitude:28.6562,longitude:77.2300},
  {name:"Sarojini Nagar Market",category:"market",address:"New Delhi",latitude:28.5754,longitude:77.1921},
  {name:"Lajpat Nagar Market",category:"market",address:"New Delhi",latitude:28.5672,longitude:77.2434},
  {name:"Karol Bagh Market",category:"market",address:"New Delhi",latitude:28.6514,longitude:77.1909},
  {name:"Crawford Market Mumbai",category:"market",address:"Mumbai",latitude:18.9462,longitude:72.8346},
  {name:"Linking Road Market",category:"market",address:"Bandra, Mumbai",latitude:19.0550,longitude:72.8298},
  {name:"New Market Kolkata",category:"market",address:"Kolkata",latitude:22.5600,longitude:88.3518},
  {name:"Burrabazar Kolkata",category:"market",address:"Kolkata",latitude:22.5748,longitude:88.3601},
];

function searchFamous(q,category,lat,lng){
  const query=q.toLowerCase().trim();
  return FAMOUS_PLACES
    .filter(p=>{
      const words=query.split(' ');
      const nameMatch=p.name.toLowerCase().includes(query)||words.every(w=>p.name.toLowerCase().includes(w));
      const catMatch=!category||category==='all'||p.category===category;
      return nameMatch&&catMatch;
    })
    .map(p=>withDist({...p,id:`famous_${p.name.replace(/\s+/g,'_')}`,avg_cost:0,osm:false},lat,lng));
}

async function searchDB(q,category,lat,lng){
  try{
    let query=`SELECT DISTINCT ON (LOWER(TRIM(name))) * FROM places WHERE name ILIKE $1 AND LENGTH(TRIM(name))>3`;
    const params=[`%${q}%`];
    if(category&&category!=='all'){params.push(category);query+=` AND category=$${params.length}`;}
    query+=' ORDER BY LOWER(TRIM(name)),id ASC LIMIT 8';
    const res=await pool.query(query,params);
    return res.rows.filter(p=>isValidName(p.name)&&isInIndia(p.latitude,p.longitude)).map(p=>withDist(p,lat,lng));
  }catch(err){console.error('DB error:',err.message);return[];}
}

async function searchNominatim(query,lat,lng,limit=6){
  const key=`nom_${query}_${Math.round((lat||0)*10)}_${Math.round((lng||0)*10)}`;
  const cached=getCached(key); if(cached) return cached;
  try{
    const params={q:query,format:'json',limit:limit*3,addressdetails:1,extratags:1,countrycodes:'in'};
    if(lat&&lng){params.viewbox=`${lng-2},${lat+2},${lng+2},${lat-2}`;params.bounded=0;}
    const res=await axios.get('https://nominatim.openstreetmap.org/search',{params,headers:{'User-Agent':'VisitWiseAI/5.0','Accept-Language':'en'},timeout:10000});
    const results=res.data
      .filter(p=>p.lat&&p.lon&&p.name&&p.name.length>3&&isValidName(p.name)&&isInIndia(p.lat,p.lon))
      .map(p=>{
        const addr=p.address||{},tags=p.extratags||{};
        const address=[addr.road||'',addr.suburb||addr.neighbourhood||'',addr.city||addr.town||addr.village||'',addr.state||''].filter(Boolean).slice(0,3).join(', ');
        const distKm=(lat&&lng)?haversine(parseFloat(lat),parseFloat(lng),parseFloat(p.lat),parseFloat(p.lon)):null;
        const category=guessCategory(
          {amenity:tags.amenity,shop:tags.shop,leisure:tags.leisure,tourism:tags.tourism,historic:tags.historic,name:p.name},
          p.type||p.class||'',
          p.display_name||''
        );
        // Skip if category is null (unknown place type)
        if(!category) return null;
        return{id:`osm_${p.place_id}`,name:p.name,osm:true,category,
          address,latitude:parseFloat(p.lat),longitude:parseFloat(p.lon),avg_cost:0,
          distance_km:distKm,distance_label:distKm?fmtDist(distKm):null};
      })
      .filter(p=>p!==null&&isValidName(p.name));
    const deduped=dedupe(results).slice(0,limit);
    setCache(key,deduped); return deduped;
  }catch(err){console.error('Nominatim error:',err.message);return[];}
}

async function cacheToDb(p){
  if(!isValidName(p.name)||!isInIndia(p.latitude,p.longitude)||!p.category) return;
  try{await pool.query(`INSERT INTO places (name,category,address,latitude,longitude,avg_cost) VALUES ($1,$2,$3,$4,$5,0) ON CONFLICT DO NOTHING`,[p.name,p.category,p.address,p.latitude,p.longitude]);}catch{}
}

async function startupCleanup(){
  try{
    await pool.query(`DELETE FROM places WHERE id NOT IN (SELECT MIN(id) FROM places GROUP BY LOWER(TRIM(name)))`);
    await pool.query(`DELETE FROM places WHERE LENGTH(TRIM(name))<=3 OR LOWER(TRIM(name))=ANY(ARRAY['patna','delhi','mumbai','kolkata','bihar','india','bengaluru','pune','chennai','hyderabad','jaipur','lucknow','agra','city','town','village','panama','gurgaon','noida','faridabad','gurugram']) OR (latitude IS NOT NULL AND (latitude<6 OR latitude>37 OR longitude<68 OR longitude>98))`);
    console.log('🧹 DB cleanup done');
  }catch(err){console.error('Cleanup error:',err.message);}
}
startupCleanup();

router.get('/',async(req,res)=>{
  try{
    const{category,search,lat,lng}=req.query;
    const hasLoc=lat&&lng;

    if(search&&search.trim().length>=2){
      const q=search.trim();
      const famousResults=searchFamous(q,category,lat,lng);
      const dbResults=await searchDB(q,category,lat,lng);
      const osmResults=await searchNominatim(q,lat,lng,5);

      const seen=new Set(famousResults.map(p=>p.name.toLowerCase().trim()));
      const uniqueDB=dbResults.filter(p=>!seen.has(p.name.toLowerCase().trim()));
      uniqueDB.forEach(p=>seen.add(p.name.toLowerCase().trim()));
      const uniqueOSM=osmResults.filter(p=>!seen.has(p.name.toLowerCase().trim()));

      let merged=[...famousResults,...uniqueDB,...uniqueOSM];
      if(category&&category!=='all'){const f=merged.filter(p=>p.category===category);merged=f.length>0?f:merged;}
      merged=dedupe(merged);
      if(hasLoc) merged.sort((a,b)=>(a.distance_km??9999)-(b.distance_km??9999));
      uniqueOSM.forEach(p=>cacheToDb(p).catch(()=>{}));
      return res.json(merged.slice(0,8));
    }

    if(hasLoc){
      const cacheKey=`nearby_${Math.round(lat*100)}_${Math.round(lng*100)}_${category}`;
      let results=getCached(cacheKey);
      if(!results){
        const nearbyFamous=FAMOUS_PLACES
          .map(p=>withDist({...p,id:`famous_${p.name.replace(/\s+/g,'_')}`,avg_cost:0},lat,lng))
          .filter(p=>p.distance_km<=50).sort((a,b)=>a.distance_km-b.distance_km);

        // Category-specific OSM queries — only exact types
        const catQ={
          all:['shopping mall','cafe restaurant','gym fitness','park garden','zoo','tourist monument','bus stand terminal','airport'],
          mall:['shopping mall shopping centre'],
          cafe:['cafe coffee shop'],
          gym:['gym fitness centre'],
          restaurant:['restaurant food dhaba'],
          park:['park garden maidan'],
          zoo:['zoo zoological safari'],
          cinema:['cinema theatre pvr inox'],
          tourist:['tourist monument temple fort palace museum ghat beach'],
          bus_stand:['bus stand terminal isbt bus station'],
          airport:['airport aerodrome'],
          market:['market bazaar sarojini chandni linking road'],
        };
        const queries=catQ[category]||catQ['all'];
        const osmRes=await Promise.all(queries.map(q=>searchNominatim(q,lat,lng,4)));
        let flat=[...nearbyFamous,...osmRes.flat()];

        try{
          const dbRes=await pool.query(`SELECT * FROM places WHERE latitude IS NOT NULL AND LENGTH(TRIM(name))>3 LIMIT 100`);
          const validDB=dbRes.rows.filter(p=>isValidName(p.name)&&isInIndia(p.latitude,p.longitude)&&p.category).map(p=>withDist(p,lat,lng)).filter(p=>p.distance_km&&p.distance_km<=30);
          flat=[...flat,...validDB];
        }catch{}

        results=dedupe(flat);
        if(category&&category!=='all'){const f=results.filter(p=>p.category===category);results=f.length>0?f:results;}
        setCache(cacheKey,results);
      }
      results.sort((a,b)=>(a.distance_km??9999)-(b.distance_km??9999));
      return res.json(results.slice(0,20));
    }

    const result=await pool.query(`SELECT DISTINCT ON (LOWER(TRIM(name))) * FROM places WHERE LENGTH(TRIM(name))>3 AND category IS NOT NULL ORDER BY LOWER(TRIM(name)),id ASC LIMIT 20`);
    return res.json(result.rows.filter(p=>isValidName(p.name)));
  }catch(err){console.error('Places error:',err.message);res.status(500).json({error:err.message});}
});

router.get('/geocode',async(req,res)=>{
  const{q}=req.query;if(!q) return res.status(400).json({error:'q required'});
  try{
    const r=await axios.get('https://nominatim.openstreetmap.org/search',{params:{q,format:'json',limit:1,addressdetails:1,countrycodes:'in'},headers:{'User-Agent':'VisitWiseAI/5.0','Accept-Language':'en'},timeout:8000});
    if(!r.data.length) return res.status(404).json({error:'Location not found'});
    const p=r.data[0];const addr=p.address||{};
    const name=[addr.suburb||addr.neighbourhood,addr.city||addr.town||addr.village||addr.county,addr.state].filter(Boolean).slice(0,2).join(', ')||p.display_name?.split(',')[0];
    res.json({lat:parseFloat(p.lat),lng:parseFloat(p.lon),name});
  }catch(err){res.status(500).json({error:err.message});}
});

router.get('/:id',async(req,res)=>{
  try{
    const{id}=req.params;
    if(String(id).startsWith('osm_')||String(id).startsWith('famous_')) return res.json({id,name:'Place',category:'mall',address:'',avg_cost:0});
    const result=await pool.query('SELECT * FROM places WHERE id=$1',[id]);
    if(!result.rows.length) return res.status(404).json({error:'Place not found.'});
    res.json(result.rows[0]);
  }catch(err){res.status(500).json({error:err.message});}
});

router.post('/',async(req,res)=>{
  const{name,category,address,latitude,longitude}=req.body;
  if(!name?.trim()) return res.status(400).json({error:'Place name is required.'});
  if(!category) return res.status(400).json({error:'Category is required.'});
  try{
    const existing=await pool.query('SELECT id FROM places WHERE LOWER(TRIM(name))=LOWER($1)',[name.trim()]);
    if(existing.rows.length>0) return res.status(409).json({error:`"${name}" already exists.`});
    const result=await pool.query('INSERT INTO places (name,category,address,latitude,longitude,avg_cost) VALUES ($1,$2,$3,$4,$5,0) RETURNING *',[name.trim(),category,address||'',latitude||null,longitude||null]);
    res.status(201).json(result.rows[0]);
  }catch(err){res.status(500).json({error:err.message});}
});

module.exports=router;
