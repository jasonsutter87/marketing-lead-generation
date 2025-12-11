import { getStore } from "@netlify/blobs";
import https from "https";

// All categories to rotate through
const CATEGORIES = [
  'dentist', 'lawyer', 'doctor', 'accountant', 'therapist',
  'chiropractor', 'insurance', 'real_estate', 'financial',
  'clinic', 'pharmacy', 'veterinary', 'optometrist', 'psychologist'
];

// All cities to rotate through
const CITIES = [
  // Major US metros
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { name: 'Phoenix', lat: 33.4484, lon: -112.0740 },
  { name: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  { name: 'San Antonio', lat: 29.4241, lon: -98.4936 },
  { name: 'San Diego', lat: 32.7157, lon: -117.1611 },
  { name: 'Dallas', lat: 32.7767, lon: -96.7970 },
  { name: 'San Jose', lat: 37.3382, lon: -121.8863 },
  { name: 'Austin', lat: 30.2672, lon: -97.7431 },
  { name: 'Jacksonville', lat: 30.3322, lon: -81.6557 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'Columbus', lat: 39.9612, lon: -82.9988 },
  { name: 'Fort Worth', lat: 32.7555, lon: -97.3308 },
  { name: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
  { name: 'Charlotte', lat: 35.2271, lon: -80.8431 },
  { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
  { name: 'Denver', lat: 39.7392, lon: -104.9903 },
  { name: 'Washington DC', lat: 38.9072, lon: -77.0369 },
  { name: 'Boston', lat: 42.3601, lon: -71.0589 },
  { name: 'Nashville', lat: 36.1627, lon: -86.7816 },
  { name: 'Detroit', lat: 42.3314, lon: -83.0458 },
  { name: 'Portland', lat: 45.5152, lon: -122.6784 },
  { name: 'Las Vegas', lat: 36.1699, lon: -115.1398 },
  { name: 'Memphis', lat: 35.1495, lon: -90.0490 },
  { name: 'Louisville', lat: 38.2527, lon: -85.7585 },
  { name: 'Baltimore', lat: 39.2904, lon: -76.6122 },
  { name: 'Milwaukee', lat: 43.0389, lon: -87.9065 },
  { name: 'Albuquerque', lat: 35.0844, lon: -106.6504 },
  { name: 'Tucson', lat: 32.2226, lon: -110.9747 },
  { name: 'Fresno', lat: 36.7378, lon: -119.7871 },
  { name: 'Sacramento', lat: 38.5816, lon: -121.4944 },
  { name: 'Atlanta', lat: 33.7490, lon: -84.3880 },
  { name: 'Miami', lat: 25.7617, lon: -80.1918 },
  { name: 'Oakland', lat: 37.8044, lon: -122.2712 },
  { name: 'Minneapolis', lat: 44.9778, lon: -93.2650 },
  { name: 'Cleveland', lat: 41.4993, lon: -81.6944 },
  { name: 'Raleigh', lat: 35.7796, lon: -78.6382 },
  { name: 'Tampa', lat: 27.9506, lon: -82.4572 },
  { name: 'Orlando', lat: 28.5383, lon: -81.3792 },
  { name: 'Pittsburgh', lat: 40.4406, lon: -79.9959 },
  { name: 'Cincinnati', lat: 39.1031, lon: -84.5120 },
  { name: 'St Louis', lat: 38.6270, lon: -90.1994 },
  { name: 'Salt Lake City', lat: 40.7608, lon: -111.8910 },
  // California cities
  { name: 'Roseville', lat: 38.7521, lon: -121.2880 },
  { name: 'Irvine', lat: 33.6846, lon: -117.8265 },
  { name: 'Santa Barbara', lat: 34.4208, lon: -119.6982 },
  { name: 'Pasadena', lat: 34.1478, lon: -118.1445 },
  { name: 'Bakersfield', lat: 35.3733, lon: -119.0187 },
];

// Category to OSM tags mapping
const CATEGORY_TAGS = {
  'dentist': ['amenity=dentist'],
  'lawyer': ['office=lawyer'],
  'doctor': ['amenity=doctors', 'amenity=clinic', 'healthcare=doctor'],
  'accountant': ['office=accountant'],
  'therapist': ['healthcare=psychotherapist', 'healthcare=counselling'],
  'chiropractor': ['healthcare=chiropractor'],
  'insurance': ['office=insurance'],
  'real_estate': ['office=estate_agent'],
  'financial': ['office=financial', 'office=financial_advisor'],
  'clinic': ['amenity=clinic', 'healthcare=clinic'],
  'pharmacy': ['amenity=pharmacy'],
  'veterinary': ['amenity=veterinary'],
  'optometrist': ['healthcare=optometrist'],
  'psychologist': ['healthcare=psychologist']
};

// HTTP fetch helper
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'LeadScraper/1.0 (Netlify Function)',
        'Accept': options.accept || 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.setTimeout(options.timeout || 30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Query OpenStreetMap Overpass API
async function searchOpenStreetMap(category, city, radius = 25000, limit = 50) {
  const tags = CATEGORY_TAGS[category] || [`name~"${category}",i`];

  const nodeQueries = tags.map(tag =>
    `node[${tag}](around:${radius},${city.lat},${city.lon});`
  ).join('\n    ');

  const wayQueries = tags.map(tag =>
    `way[${tag}](around:${radius},${city.lat},${city.lon});`
  ).join('\n    ');

  const query = `
[out:json][timeout:30];
(
    ${nodeQueries}
    ${wayQueries}
);
out body center;
  `.trim();

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    timeout: 60000
  });

  if (response.status !== 200) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = JSON.parse(response.body);
  if (!data.elements || data.elements.length === 0) {
    return [];
  }

  // Convert to our format
  const businesses = data.elements.map(el => {
    const tags = el.tags || {};
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);

    const addressParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'],
      tags['addr:state'],
      tags['addr:postcode']
    ].filter(Boolean);

    return {
      name: tags.name || tags['name:en'] || 'Unknown Business',
      category: category,
      website: tags.website || tags['contact:website'] || tags.url || '',
      phone: tags.phone || tags['contact:phone'] || '',
      email: tags.email || tags['contact:email'] || '',
      address: addressParts.join(', ') || '',
      city: tags['addr:city'] || city.name,
      state: tags['addr:state'] || '',
      lat, lon,
      osmId: el.id,
      source: 'OpenStreetMap',
      scrapedAt: new Date().toISOString(),
      scrapedCity: city.name
    };
  });

  // Filter and deduplicate
  const seen = new Set();
  return businesses.filter(b => {
    if (b.name === 'Unknown Business') return false;
    if (!b.website) return false; // Only keep businesses with websites
    const key = b.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// Check website for GA/FB tracking
async function checkWebsiteForTracking(url) {
  if (!url) return { hasGA: false, hasFB: false };

  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  try {
    const response = await fetch(url, { timeout: 15000 });
    if (response.status !== 200) {
      return { hasGA: false, hasFB: false };
    }

    const html = response.body.toLowerCase();

    const gaPatterns = [
      'google-analytics.com', 'googletagmanager.com', 'gtag(',
      'ga(', '_ga', 'analytics.js', 'gtm.js', 'ua-', 'g-'
    ];

    const fbPatterns = [
      'connect.facebook.net', 'fbq(', 'facebook pixel',
      'fb-pixel', 'fbevents.js', 'pixel/event'
    ];

    return {
      hasGA: gaPatterns.some(p => html.includes(p)),
      hasFB: fbPatterns.some(p => html.includes(p))
    };
  } catch {
    return { hasGA: false, hasFB: false };
  }
}

// Main scheduled function handler
export default async (req, context) => {
  console.log('Starting scheduled lead scrape...');

  const store = getStore('leads');
  const stateStore = getStore('state');

  // Get current rotation state
  let state;
  try {
    const stateData = await stateStore.get('rotation', { type: 'json' });
    state = stateData || { cityIndex: 0, categoryIndex: 0, totalRuns: 0 };
  } catch {
    state = { cityIndex: 0, categoryIndex: 0, totalRuns: 0 };
  }

  // Get current city and category
  const city = CITIES[state.cityIndex % CITIES.length];
  const category = CATEGORIES[state.categoryIndex % CATEGORIES.length];

  console.log(`Scraping: ${category} in ${city.name} (run #${state.totalRuns + 1})`);

  try {
    // Step 1: Search OpenStreetMap
    const businesses = await searchOpenStreetMap(category, city, 25000, 30);
    console.log(`Found ${businesses.length} businesses with websites`);

    // Step 2: Check each for tracking (with delays to avoid rate limits)
    const qualifiedLeads = [];
    for (const biz of businesses) {
      // Small delay between checks
      await new Promise(r => setTimeout(r, 300));

      const tracking = await checkWebsiteForTracking(biz.website);
      if (tracking.hasGA || tracking.hasFB) {
        qualifiedLeads.push({
          ...biz,
          hasGA: tracking.hasGA,
          hasFB: tracking.hasFB
        });
      }
    }

    console.log(`${qualifiedLeads.length} qualified leads (with GA/FB tracking)`);

    // Step 3: Get existing leads
    let allLeads = [];
    try {
      const existing = await store.get('all-leads', { type: 'json' });
      allLeads = existing || [];
    } catch {
      allLeads = [];
    }

    // Dedupe by name + city
    const existingKeys = new Set(allLeads.map(l => `${l.name.toLowerCase()}-${l.scrapedCity.toLowerCase()}`));
    const newLeads = qualifiedLeads.filter(l => {
      const key = `${l.name.toLowerCase()}-${l.scrapedCity.toLowerCase()}`;
      return !existingKeys.has(key);
    });

    console.log(`${newLeads.length} new unique leads to add`);

    // Add new leads
    allLeads = [...allLeads, ...newLeads];
    await store.setJSON('all-leads', allLeads);

    // Step 4: Update scrape history
    let history = [];
    try {
      const existingHistory = await stateStore.get('history', { type: 'json' });
      history = existingHistory || [];
    } catch {
      history = [];
    }

    history.unshift({
      timestamp: new Date().toISOString(),
      city: city.name,
      category,
      businessesFound: businesses.length,
      leadsFound: newLeads.length,
      totalLeads: allLeads.length
    });

    // Keep only last 100 history entries
    history = history.slice(0, 100);
    await stateStore.setJSON('history', history);

    // Step 5: Advance rotation
    // Rotate through all categories for current city, then move to next city
    state.categoryIndex++;
    if (state.categoryIndex >= CATEGORIES.length) {
      state.categoryIndex = 0;
      state.cityIndex++;
    }
    state.totalRuns++;
    await stateStore.setJSON('rotation', state);

    console.log(`Complete! Total leads: ${allLeads.length}. Next: ${CATEGORIES[state.categoryIndex % CATEGORIES.length]} in ${CITIES[state.cityIndex % CITIES.length].name}`);

    return new Response(JSON.stringify({
      success: true,
      city: city.name,
      category,
      newLeads: newLeads.length,
      totalLeads: allLeads.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scrape error:', error);

    // Still advance rotation on error so we don't get stuck
    state.categoryIndex++;
    if (state.categoryIndex >= CATEGORIES.length) {
      state.categoryIndex = 0;
      state.cityIndex++;
    }
    state.totalRuns++;
    await stateStore.setJSON('rotation', state);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      city: city.name,
      category
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Configure as scheduled function
export const config = {
  schedule: "@hourly"
};
