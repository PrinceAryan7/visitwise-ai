// frontend/src/services/api.js
import axios from 'axios';

const API  = 'http://localhost:5000/api';
const PRED = 'http://localhost:8001';

export const getPlaces = (category='all', search='', lat=null, lng=null) =>
  axios.get(`${API}/places`, { params:{category,search,lat,lng} }).then(r=>r.data);

export const getPlaceById = (id) =>
  axios.get(`${API}/places/${id}`).then(r=>r.data);

export const addPlace = (data) =>
  axios.post(`${API}/places`, data).then(r=>r.data);

export const geocodeLocation = (q) =>
  axios.get(`${API}/places/geocode`, { params:{q} }).then(r=>r.data);

// NOW passes place_name so prediction engine gives accurate data per place
export const getPrediction = (place_id, category='mall', place_name='', target_hour=null, target_day=null) =>
  axios.post(`${PRED}/predict`, {
    place_id:    String(place_id),
    category:    category  || 'mall',
    place_name:  place_name || '',
    target_hour: target_hour,
    target_day:  target_day,
  })
  .then(r => r.data)
  .catch(() => ({
    crowd_level:    'Unknown',
    crowd_score:    0,
    active_users:   0,
    waiting_time:   'N/A',
    estimated_cost: 'N/A',
    best_time:      'N/A',
    trend:          '',
    open_status:    'N/A',
    confidence:     'low',
  }));
