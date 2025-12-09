#!/usr/bin/env node

/**
 * Marketing Lead Scraper
 *
 * Scrapes business listings from OpenStreetMap (Overpass API).
 * Automatically detects Google Analytics & Facebook Pixel usage.
 * No API key required - completely free.
 *
 * Usage:
 *   node scrape-leads.js --category "dentist" --location "Los Angeles"
 *   node scrape-leads.js -c "lawyer" -l "San Francisco" -n 100 --filter
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    category: 'dentist',
    location: 'Sacramento, California, USA',
    limit: 30,
    radius: 25000, // meters (25km)
    output: null,
    filterTracking: false, // Only show businesses with GA or FB Pixel
    checkTracking: false   // Check websites for tracking (slower)
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        config.category = args[++i];
        break;
      case '--location':
      case '-l':
        config.location = args[++i];
        break;
      case '--limit':
      case '-n':
        config.limit = parseInt(args[++i], 10);
        break;
      case '--radius':
      case '-r':
        config.radius = parseInt(args[++i], 10) * 1000; // convert km to m
        break;
      case '--output':
      case '-o':
        config.output = args[++i];
        break;
      case '--filter':
      case '-f':
        config.filterTracking = true;
        config.checkTracking = true;
        break;
      case '--check':
        config.checkTracking = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  // Auto-generate output filename
  if (!config.output) {
    const sanitized = `${config.category}-${config.location}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const suffix = config.filterTracking ? '-tracking-only' : '';
    config.output = path.join(__dirname, 'leads', `${sanitized}-${date}${suffix}.csv`);
  }

  return config;
}

function printHelp() {
  console.log(`
Marketing Lead Scraper

Scrapes OpenStreetMap for local business leads. No API key required.
Can automatically check websites for Google Analytics & Facebook Pixel.

Usage:
  node scrape-leads.js [options]

Options:
  -c, --category <type>    Business type (default: "dentist")
  -l, --location <place>   City name (default: "Sacramento")
  -n, --limit <number>     Max results to fetch (default: 30)
  -r, --radius <km>        Search radius in kilometers (default: 25)
  -f, --filter             CHECK WEBSITES & FILTER: Only output businesses using GA or FB Pixel
      --check              Check websites for tracking but include all results
  -o, --output <file>      Output CSV file path
  -h, --help               Show this help message

Examples:
  # Basic search (fast, no website checking)
  node scrape-leads.js -c "dentist" -l "Los Angeles"

  # Check websites and ONLY show those with GA or FB Pixel (recommended!)
  node scrape-leads.js -c "dentist" -l "Los Angeles" -n 100 --filter

  # Check websites but include all results
  node scrape-leads.js -c "lawyer" -l "San Francisco" --check

  # Larger search radius
  node scrape-leads.js -c "doctor" -l "Austin" -r 50 --filter

Supported categories:
  dentist, lawyer, doctor, accountant, therapist, chiropractor,
  insurance, real_estate, financial, clinic, pharmacy, veterinary

Supported cities (instant lookup):
  Los Angeles, New York, Chicago, Houston, Phoenix, San Diego,
  Dallas, San Jose, Austin, San Francisco, Seattle, Denver,
  Boston, Atlanta, Miami, Sacramento, Portland, Las Vegas, etc.

Note: Using --filter is slower (checks each website) but gives you
      qualified leads ready for outreach.
`);
}

// Fetch URL with proper headers
function fetch(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'LeadScraper/1.0',
        'Accept': 'application/json',
        ...customHeaders
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// POST request for Overpass API
function postFetch(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'User-Agent': 'LeadScraper/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

// Common US cities with coordinates (fallback if geocoding fails)
const US_CITIES = {
  'los angeles': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles, CA' },
  'new york': { lat: 40.7128, lon: -74.0060, name: 'New York, NY' },
  'chicago': { lat: 41.8781, lon: -87.6298, name: 'Chicago, IL' },
  'houston': { lat: 29.7604, lon: -95.3698, name: 'Houston, TX' },
  'phoenix': { lat: 33.4484, lon: -112.0740, name: 'Phoenix, AZ' },
  'philadelphia': { lat: 39.9526, lon: -75.1652, name: 'Philadelphia, PA' },
  'san antonio': { lat: 29.4241, lon: -98.4936, name: 'San Antonio, TX' },
  'san diego': { lat: 32.7157, lon: -117.1611, name: 'San Diego, CA' },
  'dallas': { lat: 32.7767, lon: -96.7970, name: 'Dallas, TX' },
  'san jose': { lat: 37.3382, lon: -121.8863, name: 'San Jose, CA' },
  'austin': { lat: 30.2672, lon: -97.7431, name: 'Austin, TX' },
  'jacksonville': { lat: 30.3322, lon: -81.6557, name: 'Jacksonville, FL' },
  'san francisco': { lat: 37.7749, lon: -122.4194, name: 'San Francisco, CA' },
  'columbus': { lat: 39.9612, lon: -82.9988, name: 'Columbus, OH' },
  'fort worth': { lat: 32.7555, lon: -97.3308, name: 'Fort Worth, TX' },
  'indianapolis': { lat: 39.7684, lon: -86.1581, name: 'Indianapolis, IN' },
  'charlotte': { lat: 35.2271, lon: -80.8431, name: 'Charlotte, NC' },
  'seattle': { lat: 47.6062, lon: -122.3321, name: 'Seattle, WA' },
  'denver': { lat: 39.7392, lon: -104.9903, name: 'Denver, CO' },
  'washington': { lat: 38.9072, lon: -77.0369, name: 'Washington, DC' },
  'boston': { lat: 42.3601, lon: -71.0589, name: 'Boston, MA' },
  'nashville': { lat: 36.1627, lon: -86.7816, name: 'Nashville, TN' },
  'detroit': { lat: 42.3314, lon: -83.0458, name: 'Detroit, MI' },
  'portland': { lat: 45.5152, lon: -122.6784, name: 'Portland, OR' },
  'las vegas': { lat: 36.1699, lon: -115.1398, name: 'Las Vegas, NV' },
  'memphis': { lat: 35.1495, lon: -90.0490, name: 'Memphis, TN' },
  'louisville': { lat: 38.2527, lon: -85.7585, name: 'Louisville, KY' },
  'baltimore': { lat: 39.2904, lon: -76.6122, name: 'Baltimore, MD' },
  'milwaukee': { lat: 43.0389, lon: -87.9065, name: 'Milwaukee, WI' },
  'albuquerque': { lat: 35.0844, lon: -106.6504, name: 'Albuquerque, NM' },
  'tucson': { lat: 32.2226, lon: -110.9747, name: 'Tucson, AZ' },
  'fresno': { lat: 36.7378, lon: -119.7871, name: 'Fresno, CA' },
  'sacramento': { lat: 38.5816, lon: -121.4944, name: 'Sacramento, CA' },
  'atlanta': { lat: 33.7490, lon: -84.3880, name: 'Atlanta, GA' },
  'miami': { lat: 25.7617, lon: -80.1918, name: 'Miami, FL' },
  'oakland': { lat: 37.8044, lon: -122.2712, name: 'Oakland, CA' },
  'minneapolis': { lat: 44.9778, lon: -93.2650, name: 'Minneapolis, MN' },
  'cleveland': { lat: 41.4993, lon: -81.6944, name: 'Cleveland, OH' },
  'raleigh': { lat: 35.7796, lon: -78.6382, name: 'Raleigh, NC' },
  'tampa': { lat: 27.9506, lon: -82.4572, name: 'Tampa, FL' },
  'orlando': { lat: 28.5383, lon: -81.3792, name: 'Orlando, FL' },
  'pittsburgh': { lat: 40.4406, lon: -79.9959, name: 'Pittsburgh, PA' },
  'cincinnati': { lat: 39.1031, lon: -84.5120, name: 'Cincinnati, OH' },
  'st louis': { lat: 38.6270, lon: -90.1994, name: 'St. Louis, MO' },
  'salt lake city': { lat: 40.7608, lon: -111.8910, name: 'Salt Lake City, UT' },

  // Sacramento area / Northern California
  'roseville': { lat: 38.7521, lon: -121.2880, name: 'Roseville, CA' },
  'folsom': { lat: 38.6780, lon: -121.1761, name: 'Folsom, CA' },
  'elk grove': { lat: 38.4088, lon: -121.3716, name: 'Elk Grove, CA' },
  'rocklin': { lat: 38.7907, lon: -121.2358, name: 'Rocklin, CA' },
  'citrus heights': { lat: 38.7071, lon: -121.2811, name: 'Citrus Heights, CA' },
  'rancho cordova': { lat: 38.5891, lon: -121.3028, name: 'Rancho Cordova, CA' },
  'davis': { lat: 38.5449, lon: -121.7405, name: 'Davis, CA' },
  'woodland': { lat: 38.6785, lon: -121.7733, name: 'Woodland, CA' },
  'vacaville': { lat: 38.3566, lon: -121.9877, name: 'Vacaville, CA' },
  'fairfield': { lat: 38.2494, lon: -122.0400, name: 'Fairfield, CA' },
  'vallejo': { lat: 38.1041, lon: -122.2566, name: 'Vallejo, CA' },
  'napa': { lat: 38.2975, lon: -122.2869, name: 'Napa, CA' },
  'santa rosa': { lat: 38.4404, lon: -122.7141, name: 'Santa Rosa, CA' },
  'stockton': { lat: 37.9577, lon: -121.2908, name: 'Stockton, CA' },
  'modesto': { lat: 37.6391, lon: -120.9969, name: 'Modesto, CA' },

  // Bay Area
  'berkeley': { lat: 37.8716, lon: -122.2727, name: 'Berkeley, CA' },
  'fremont': { lat: 37.5485, lon: -121.9886, name: 'Fremont, CA' },
  'hayward': { lat: 37.6688, lon: -122.0808, name: 'Hayward, CA' },
  'sunnyvale': { lat: 37.3688, lon: -122.0363, name: 'Sunnyvale, CA' },
  'santa clara': { lat: 37.3541, lon: -121.9552, name: 'Santa Clara, CA' },
  'mountain view': { lat: 37.3861, lon: -122.0839, name: 'Mountain View, CA' },
  'palo alto': { lat: 37.4419, lon: -122.1430, name: 'Palo Alto, CA' },
  'redwood city': { lat: 37.4852, lon: -122.2364, name: 'Redwood City, CA' },
  'san mateo': { lat: 37.5630, lon: -122.3255, name: 'San Mateo, CA' },
  'daly city': { lat: 37.6879, lon: -122.4702, name: 'Daly City, CA' },
  'concord': { lat: 37.9780, lon: -122.0311, name: 'Concord, CA' },
  'walnut creek': { lat: 37.9101, lon: -122.0652, name: 'Walnut Creek, CA' },
  'richmond': { lat: 37.9358, lon: -122.3478, name: 'Richmond, CA' },
  'antioch': { lat: 38.0049, lon: -121.8058, name: 'Antioch, CA' },
  'pleasanton': { lat: 37.6624, lon: -121.8747, name: 'Pleasanton, CA' },
  'livermore': { lat: 37.6819, lon: -121.7680, name: 'Livermore, CA' },

  // Southern California
  'long beach': { lat: 33.7701, lon: -118.1937, name: 'Long Beach, CA' },
  'anaheim': { lat: 33.8366, lon: -117.9143, name: 'Anaheim, CA' },
  'santa ana': { lat: 33.7455, lon: -117.8677, name: 'Santa Ana, CA' },
  'irvine': { lat: 33.6846, lon: -117.8265, name: 'Irvine, CA' },
  'huntington beach': { lat: 33.6595, lon: -117.9988, name: 'Huntington Beach, CA' },
  'glendale': { lat: 34.1425, lon: -118.2551, name: 'Glendale, CA' },
  'pasadena': { lat: 34.1478, lon: -118.1445, name: 'Pasadena, CA' },
  'torrance': { lat: 33.8358, lon: -118.3406, name: 'Torrance, CA' },
  'pomona': { lat: 34.0551, lon: -117.7500, name: 'Pomona, CA' },
  'ontario': { lat: 34.0633, lon: -117.6509, name: 'Ontario, CA' },
  'rancho cucamonga': { lat: 34.1064, lon: -117.5931, name: 'Rancho Cucamonga, CA' },
  'riverside': { lat: 33.9533, lon: -117.3962, name: 'Riverside, CA' },
  'corona': { lat: 33.8753, lon: -117.5664, name: 'Corona, CA' },
  'moreno valley': { lat: 33.9425, lon: -117.2297, name: 'Moreno Valley, CA' },
  'fontana': { lat: 34.0922, lon: -117.4350, name: 'Fontana, CA' },
  'san bernardino': { lat: 34.1083, lon: -117.2898, name: 'San Bernardino, CA' },
  'santa monica': { lat: 34.0195, lon: -118.4912, name: 'Santa Monica, CA' },
  'burbank': { lat: 34.1808, lon: -118.3090, name: 'Burbank, CA' },
  'costa mesa': { lat: 33.6411, lon: -117.9187, name: 'Costa Mesa, CA' },
  'newport beach': { lat: 33.6189, lon: -117.9289, name: 'Newport Beach, CA' },
  'fullerton': { lat: 33.8703, lon: -117.9242, name: 'Fullerton, CA' },
  'orange': { lat: 33.7879, lon: -117.8531, name: 'Orange, CA' },
  'oceanside': { lat: 33.1959, lon: -117.3795, name: 'Oceanside, CA' },
  'carlsbad': { lat: 33.1581, lon: -117.3506, name: 'Carlsbad, CA' },
  'escondido': { lat: 33.1192, lon: -117.0864, name: 'Escondido, CA' },
  'temecula': { lat: 33.4936, lon: -117.1484, name: 'Temecula, CA' },
  'murrieta': { lat: 33.5539, lon: -117.2139, name: 'Murrieta, CA' },
  'santa barbara': { lat: 34.4208, lon: -119.6982, name: 'Santa Barbara, CA' },
  'ventura': { lat: 34.2805, lon: -119.2945, name: 'Ventura, CA' },
  'oxnard': { lat: 34.1975, lon: -119.1771, name: 'Oxnard, CA' },
  'thousand oaks': { lat: 34.1706, lon: -118.8376, name: 'Thousand Oaks, CA' },
  'simi valley': { lat: 34.2694, lon: -118.7815, name: 'Simi Valley, CA' },
  'bakersfield': { lat: 35.3733, lon: -119.0187, name: 'Bakersfield, CA' },
  'visalia': { lat: 36.3302, lon: -119.2921, name: 'Visalia, CA' },

  // Central Coast
  'san luis obispo': { lat: 35.2828, lon: -120.6596, name: 'San Luis Obispo, CA' },
  'santa cruz': { lat: 36.9741, lon: -122.0308, name: 'Santa Cruz, CA' },
  'monterey': { lat: 36.6002, lon: -121.8947, name: 'Monterey, CA' },
  'salinas': { lat: 36.6777, lon: -121.6555, name: 'Salinas, CA' }
};

// Geocode location - try local lookup first, then Nominatim
async function geocodeLocation(location) {
  console.log('  Geocoding location...');

  // Try local lookup first
  const locationLower = location.toLowerCase();
  for (const [city, coords] of Object.entries(US_CITIES)) {
    if (locationLower.includes(city)) {
      console.log(`  Found: ${coords.name} (local lookup)`);
      return {
        lat: coords.lat,
        lon: coords.lon,
        displayName: coords.name
      };
    }
  }

  // Fall back to Nominatim
  console.log('  City not in local cache, trying Nominatim API...');

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const response = await fetch(url);

  if (response.status === 403 || response.status === 429) {
    throw new Error(`Nominatim rate limited. Try one of these cities: ${Object.keys(US_CITIES).slice(0, 10).join(', ')}`);
  }

  if (response.status !== 200) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const data = JSON.parse(response.body);

  if (!data || data.length === 0) {
    throw new Error(`Could not find location: ${location}. Try one of: ${Object.keys(US_CITIES).slice(0, 10).join(', ')}`);
  }

  const result = data[0];
  console.log(`  Found: ${result.display_name}`);

  return {
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    displayName: result.display_name
  };
}

// Map user-friendly category names to OSM tags
function getCategoryTags(category) {
  const categoryMap = {
    'dentist': ['amenity=dentist'],
    'dentists': ['amenity=dentist'],
    'dental': ['amenity=dentist'],

    'lawyer': ['office=lawyer'],
    'lawyers': ['office=lawyer'],
    'attorney': ['office=lawyer'],
    'law': ['office=lawyer'],

    'doctor': ['amenity=doctors', 'amenity=clinic', 'healthcare=doctor'],
    'doctors': ['amenity=doctors', 'amenity=clinic', 'healthcare=doctor'],
    'physician': ['amenity=doctors', 'healthcare=doctor'],
    'medical': ['amenity=doctors', 'amenity=clinic'],

    'accountant': ['office=accountant'],
    'accountants': ['office=accountant'],
    'cpa': ['office=accountant'],

    'therapist': ['healthcare=psychotherapist', 'healthcare=counselling'],
    'therapists': ['healthcare=psychotherapist', 'healthcare=counselling'],
    'counselor': ['healthcare=counselling'],

    'chiropractor': ['healthcare=chiropractor'],
    'chiropractors': ['healthcare=chiropractor'],
    'chiro': ['healthcare=chiropractor'],

    'insurance': ['office=insurance'],
    'real_estate': ['office=estate_agent'],
    'real estate': ['office=estate_agent'],
    'realtor': ['office=estate_agent'],

    'financial': ['office=financial', 'office=financial_advisor'],
    'financial advisor': ['office=financial_advisor'],

    'clinic': ['amenity=clinic', 'healthcare=clinic'],
    'pharmacy': ['amenity=pharmacy'],
    'veterinary': ['amenity=veterinary'],
    'vet': ['amenity=veterinary'],

    'optometrist': ['healthcare=optometrist'],
    'psychologist': ['healthcare=psychologist']
  };

  const key = category.toLowerCase();
  return categoryMap[key] || [`name~"${category}",i`]; // Fallback to name search
}

// Query OpenStreetMap Overpass API
async function searchOpenStreetMap(config, coords) {
  console.log('  Querying OpenStreetMap...');

  const tags = getCategoryTags(config.category);

  // Build query for all relevant tags
  const nodeQueries = tags.map(tag =>
    `node[${tag}](around:${config.radius},${coords.lat},${coords.lon});`
  ).join('\n    ');

  const wayQueries = tags.map(tag =>
    `way[${tag}](around:${config.radius},${coords.lat},${coords.lon});`
  ).join('\n    ');

  const query = `
[out:json][timeout:30];
(
    ${nodeQueries}
    ${wayQueries}
);
out body center;
  `.trim();

  const response = await postFetch(
    'https://overpass-api.de/api/interpreter',
    `data=${encodeURIComponent(query)}`
  );

  if (response.status !== 200) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = JSON.parse(response.body);

  if (!data.elements || data.elements.length === 0) {
    return [];
  }

  console.log(`  Found ${data.elements.length} results from OpenStreetMap`);

  // Convert to our format
  const businesses = data.elements.map(el => {
    const tags = el.tags || {};

    // Get coordinates (for ways, use the center)
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);

    // Build address
    const addressParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'],
      tags['addr:state'],
      tags['addr:postcode']
    ].filter(Boolean);

    return {
      name: tags.name || tags['name:en'] || 'Unknown Business',
      category: config.category,
      website: tags.website || tags['contact:website'] || tags.url || '',
      phone: tags.phone || tags['contact:phone'] || '',
      email: tags.email || tags['contact:email'] || '',
      address: addressParts.join(', ') || '',
      city: tags['addr:city'] || '',
      state: tags['addr:state'] || '',
      lat: lat,
      lon: lon,
      osmId: el.id,
      source: 'OpenStreetMap'
    };
  });

  // Filter out entries without names and deduplicate
  const seen = new Set();
  return businesses.filter(b => {
    if (b.name === 'Unknown Business') return false;
    const key = b.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Check a website for Google Analytics and Facebook Pixel
async function checkWebsiteForTracking(url) {
  if (!url) return { hasGA: false, hasFB: false, error: 'No URL' };

  // Normalize URL
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  try {
    const response = await fetch(url);

    if (response.status !== 200) {
      return { hasGA: false, hasFB: false, error: `HTTP ${response.status}` };
    }

    const html = response.body.toLowerCase();

    // Check for Google Analytics
    const gaPatterns = [
      'google-analytics.com',
      'googletagmanager.com',
      'gtag(',
      'ga(',
      '_ga',
      'analytics.js',
      'gtm.js',
      'ua-', // Universal Analytics ID pattern
      'g-',  // GA4 ID pattern
    ];

    // Check for Facebook Pixel
    const fbPatterns = [
      'connect.facebook.net',
      'fbq(',
      'facebook pixel',
      'fb-pixel',
      'fbevents.js',
      'pixel/event',
    ];

    const hasGA = gaPatterns.some(pattern => html.includes(pattern));
    const hasFB = fbPatterns.some(pattern => html.includes(pattern));

    return { hasGA, hasFB, error: null };

  } catch (error) {
    return { hasGA: false, hasFB: false, error: error.message };
  }
}

// Check multiple businesses for tracking (with rate limiting)
async function checkBusinessesForTracking(businesses, onProgress) {
  const results = [];
  let checked = 0;

  for (const biz of businesses) {
    checked++;

    if (!biz.website) {
      biz.hasGA = false;
      biz.hasFB = false;
      biz.trackingError = 'No website';
      results.push(biz);
      onProgress(checked, businesses.length, biz.name, 'skipped (no website)');
      continue;
    }

    // Rate limit: wait 500ms between requests
    await new Promise(r => setTimeout(r, 500));

    const tracking = await checkWebsiteForTracking(biz.website);
    biz.hasGA = tracking.hasGA;
    biz.hasFB = tracking.hasFB;
    biz.trackingError = tracking.error;

    results.push(biz);

    const status = tracking.error
      ? `error: ${tracking.error}`
      : `GA: ${tracking.hasGA ? 'YES' : 'no'}, FB: ${tracking.hasFB ? 'YES' : 'no'}`;

    onProgress(checked, businesses.length, biz.name, status);
  }

  return results;
}

// Convert results to CSV
function toCSV(businesses) {
  const headers = [
    'Business Name',
    'Category',
    'Website',
    'Phone',
    'Email',
    'Address',
    'City',
    'State',
    'Has GA?',
    'Has FB Pixel?',
    'Contacted?',
    'Notes',
    'Source'
  ];

  const rows = businesses.map(biz => [
    biz.name,
    biz.category,
    biz.website,
    biz.phone,
    biz.email,
    biz.address,
    biz.city,
    biz.state,
    biz.hasGA ? 'YES' : '',
    biz.hasFB ? 'YES' : '',
    '', // Contacted?
    '', // Notes
    biz.source
  ]);

  // Escape CSV fields
  const escape = (field) => {
    const str = String(field || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\n');
}

// Main execution
async function main() {
  const config = parseArgs();

  console.log('='.repeat(60));
  console.log('Marketing Lead Scraper');
  console.log('='.repeat(60));
  console.log(`Category: ${config.category}`);
  console.log(`Location: ${config.location}`);
  console.log(`Radius: ${config.radius / 1000}km`);
  console.log(`Limit: ${config.limit}`);
  if (config.filterTracking) {
    console.log(`Mode: FILTER - Only businesses with GA or FB Pixel`);
  } else if (config.checkTracking) {
    console.log(`Mode: CHECK - Will check all websites for tracking`);
  }

  try {
    // Step 1: Geocode the location
    console.log('\nStep 1: Finding location...');
    await new Promise(r => setTimeout(r, 1000)); // Rate limit for Nominatim
    const coords = await geocodeLocation(config.location);

    // Step 2: Search OpenStreetMap
    console.log('\nStep 2: Searching for businesses...');
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
    let businesses = await searchOpenStreetMap(config, coords);

    if (businesses.length === 0) {
      console.log('\n' + '='.repeat(60));
      console.log('No businesses found.');
      console.log('='.repeat(60));
      console.log('\nTips:');
      console.log('  - Try a larger city (OpenStreetMap has better coverage in urban areas)');
      console.log('  - Try different category: "doctor" vs "physician"');
      console.log('  - Increase radius: -r 50 (50km)');
      return;
    }

    // Filter to only businesses with websites if we're checking tracking
    let businessesToCheck = businesses;
    if (config.checkTracking) {
      const withWebsites = businesses.filter(b => b.website);
      console.log(`\n  ${withWebsites.length} of ${businesses.length} have websites`);

      // If filtering, we only care about ones with websites
      if (config.filterTracking) {
        businessesToCheck = withWebsites.slice(0, config.limit);
      } else {
        businessesToCheck = businesses.slice(0, config.limit);
      }
    } else {
      businessesToCheck = businesses.slice(0, config.limit);
    }

    // Step 3: Check websites for tracking (if enabled)
    if (config.checkTracking) {
      const websitesToCheck = businessesToCheck.filter(b => b.website).length;
      console.log(`\nStep 3: Checking ${websitesToCheck} websites for GA/FB tracking...`);
      console.log('  (This may take a few minutes)\n');

      businessesToCheck = await checkBusinessesForTracking(
        businessesToCheck,
        (current, total, name, status) => {
          const pct = Math.round((current / total) * 100);
          const truncName = name.length > 30 ? name.substring(0, 27) + '...' : name;
          process.stdout.write(`\r  [${pct}%] ${current}/${total} - ${truncName.padEnd(30)} ${status}`.padEnd(100));
        }
      );

      console.log('\n'); // New line after progress

      // Filter to only those with tracking if requested
      if (config.filterTracking) {
        const beforeCount = businessesToCheck.length;
        businessesToCheck = businessesToCheck.filter(b => b.hasGA || b.hasFB);
        console.log(`  Filtered: ${businessesToCheck.length} of ${beforeCount} have GA or FB Pixel`);
      }
    }

    if (businessesToCheck.length === 0) {
      console.log('\n' + '='.repeat(60));
      console.log('No qualified leads found.');
      console.log('='.repeat(60));
      console.log('\nTry:');
      console.log('  - Increasing --limit to check more businesses');
      console.log('  - Trying a different category or location');
      console.log('  - Running without --filter to see all results');
      return;
    }

    // Step 4: Save to CSV
    const stepNum = config.checkTracking ? 4 : 3;
    console.log(`\nStep ${stepNum}: Saving results...`);

    const outputDir = path.dirname(config.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const csv = toCSV(businessesToCheck);
    fs.writeFileSync(config.output, csv, 'utf8');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`SUCCESS: ${businessesToCheck.length} qualified leads`);
    console.log(`Output: ${config.output}`);
    console.log('='.repeat(60));

    if (config.checkTracking) {
      const withGA = businessesToCheck.filter(b => b.hasGA).length;
      const withFB = businessesToCheck.filter(b => b.hasFB).length;
      const withBoth = businessesToCheck.filter(b => b.hasGA && b.hasFB).length;
      console.log(`\nTracking breakdown:`);
      console.log(`  Google Analytics: ${withGA}`);
      console.log(`  Facebook Pixel: ${withFB}`);
      console.log(`  Both GA + FB: ${withBoth}`);
    }

    // Show preview
    console.log('\nPreview (first 5):');
    businessesToCheck.slice(0, 5).forEach((b, i) => {
      let tracking = '';
      if (config.checkTracking) {
        const trackers = [];
        if (b.hasGA) trackers.push('GA');
        if (b.hasFB) trackers.push('FB');
        tracking = trackers.length > 0 ? ` [${trackers.join('+')}]` : '';
      }
      console.log(`  ${i + 1}. ${b.name}${tracking}`);
      if (b.website) console.log(`     ${b.website}`);
    });

    console.log('\nNext steps:');
    console.log('1. Open the CSV in Excel or Google Sheets');
    console.log('2. Find contact emails on their websites');
    console.log('3. Send personalized outreach emails');
    console.log('4. Mark "Contacted" column as you go\n');

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('  - Check your internet connection');
    console.error('  - Try a different location format');
    console.error('  - OpenStreetMap/Overpass may be temporarily down\n');
    process.exit(1);
  }
}

main();
