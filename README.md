# Marketing Lead Scraper

A Node.js script that finds local businesses and automatically identifies which ones use Google Analytics or Facebook Pixel — perfect for targeting businesses that might want to switch to a privacy-first analytics solution.

**No API keys required.** Uses free OpenStreetMap data.

---

## Quick Start

```bash
# Find dentists in Los Angeles using Google Analytics or Facebook Pixel
node scrape-leads.js -c "dentist" -l "Los Angeles" -n 100 --filter
```

Output: `leads/dentist-los-angeles-2025-12-09-tracking-only.csv`

---

## Installation

No installation needed — uses only Node.js built-in modules.

Requirements:
- Node.js 14+

---

## Usage

```bash
node scrape-leads.js [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --category` | Business type to search | `dentist` |
| `-l, --location` | City name | `Sacramento` |
| `-n, --limit` | Max businesses to check | `30` |
| `-r, --radius` | Search radius in km | `25` |
| `-f, --filter` | **Only output businesses with GA or FB Pixel** | off |
| `--check` | Check websites but include all results | off |
| `-o, --output` | Custom output file path | auto-generated |
| `-h, --help` | Show help | |

---

## Examples

### Find GA/FB Users (Recommended)

Use `--filter` to only get businesses that use Google Analytics or Facebook Pixel:

```bash
# Dentists in Los Angeles using tracking
node scrape-leads.js -c "dentist" -l "Los Angeles" -n 100 --filter

# Lawyers in San Francisco using tracking
node scrape-leads.js -c "lawyer" -l "San Francisco" -n 100 --filter

# Doctors in Chicago using tracking
node scrape-leads.js -c "doctor" -l "Chicago" -n 150 --filter
```

### Check All Websites (No Filter)

Use `--check` to check all websites but include everything in output:

```bash
node scrape-leads.js -c "dentist" -l "Seattle" -n 50 --check
```

### Fast Search (No Website Checking)

Skip website checking for a quick list:

```bash
node scrape-leads.js -c "dentist" -l "Miami" -n 100
```

### Larger Search Radius

Expand to 50km radius:

```bash
node scrape-leads.js -c "chiropractor" -l "Austin" -r 50 --filter
```

---

## Supported Categories

| Category | OSM Tags Searched |
|----------|-------------------|
| `dentist` | amenity=dentist |
| `lawyer` | office=lawyer |
| `doctor` | amenity=doctors, amenity=clinic |
| `accountant` | office=accountant |
| `therapist` | healthcare=psychotherapist |
| `chiropractor` | healthcare=chiropractor |
| `insurance` | office=insurance |
| `real_estate` | office=estate_agent |
| `financial` | office=financial |
| `clinic` | amenity=clinic |
| `pharmacy` | amenity=pharmacy |
| `veterinary` | amenity=veterinary |
| `optometrist` | healthcare=optometrist |
| `psychologist` | healthcare=psychologist |

---

## Supported Cities

The following US cities have instant geocoding (no API call needed):

| | | | |
|---|---|---|---|
| Los Angeles | New York | Chicago | Houston |
| Phoenix | Philadelphia | San Antonio | San Diego |
| Dallas | San Jose | Austin | Jacksonville |
| San Francisco | Columbus | Fort Worth | Indianapolis |
| Charlotte | Seattle | Denver | Washington |
| Boston | Nashville | Detroit | Portland |
| Las Vegas | Memphis | Louisville | Baltimore |
| Milwaukee | Albuquerque | Tucson | Fresno |
| Sacramento | Atlanta | Miami | Oakland |
| Minneapolis | Cleveland | Raleigh | Tampa |
| Orlando | Pittsburgh | Cincinnati | St Louis |
| Salt Lake City | | | |

Other locations will use the Nominatim API (may be rate-limited).

---

## Output Format

CSV file with columns:

| Column | Description |
|--------|-------------|
| Business Name | Name from OpenStreetMap |
| Category | Search category used |
| Website | Business website URL |
| Phone | Phone number (if available) |
| Email | Email address (if available) |
| Address | Street address |
| City | City name |
| State | State abbreviation |
| Has GA? | `YES` if Google Analytics detected |
| Has FB Pixel? | `YES` if Facebook Pixel detected |
| Contacted? | Empty (for your tracking) |
| Notes | Empty (for your notes) |
| Source | Data source (OpenStreetMap) |

---

## What Gets Detected

### Google Analytics
- `google-analytics.com`
- `googletagmanager.com`
- `gtag(`
- `analytics.js`
- `gtm.js`
- `UA-` (Universal Analytics ID)
- `G-` (GA4 ID)

### Facebook Pixel
- `connect.facebook.net`
- `fbq(`
- `fbevents.js`

---

## Example Output

```
============================================================
Marketing Lead Scraper
============================================================
Category: dentist
Location: Los Angeles
Radius: 25km
Limit: 100
Mode: FILTER - Only businesses with GA or FB Pixel

Step 1: Finding location...
  Found: Los Angeles, CA (local lookup)

Step 2: Searching for businesses...
  Found 387 results from OpenStreetMap
  73 of 305 have websites

Step 3: Checking 73 websites for GA/FB tracking...
  [100%] 73/73 - Beach Braces                   GA: YES, FB: YES

  Filtered: 35 of 73 have GA or FB Pixel

Step 4: Saving results...

============================================================
SUCCESS: 35 qualified leads
Output: leads/dentist-los-angeles-2025-12-09-tracking-only.csv
============================================================

Tracking breakdown:
  Google Analytics: 35
  Facebook Pixel: 3
  Both GA + FB: 3

Preview (first 5):
  1. Pasadena Dentistry [GA]
     https://pasadenadentistry.com/
  2. Sunset Plaza Dental [GA]
     https://sunsetplazadental.com/
  3. Beach Braces [GA+FB]
     https://www.beachbraces.org/
```

---

## Workflow

1. **Run the scraper with `--filter`**
   ```bash
   node scrape-leads.js -c "dentist" -l "Los Angeles" -n 100 --filter
   ```

2. **Open the CSV in Excel or Google Sheets**

3. **For each lead:**
   - Visit their website
   - Find contact email (usually on Contact or About page)
   - Add to the Email column

4. **Send personalized outreach**
   - Reference their specific website
   - Mention they're using Google Analytics
   - Offer your alternative solution

5. **Track progress**
   - Mark "Contacted?" column as you go
   - Add notes about responses

---

## Tips

- **Start with 100 leads** — The `--filter` flag typically yields 30-50% qualified results
- **Try multiple cities** — Coverage varies by location
- **Use singular categories** — `dentist` works better than `dentists`
- **Increase radius for suburbs** — `-r 50` for 50km radius
- **Be patient** — Website checking takes ~0.5s per site

---

## Troubleshooting

### "No businesses found"
- Try a larger city (OpenStreetMap has better urban coverage)
- Increase radius: `-r 50`
- Try different category spelling: `doctor` vs `physician`

### "Geocoding failed"
- Use a supported city name from the list above
- Try simpler format: `"Los Angeles"` not `"Los Angeles, CA, USA"`

### Slow performance
- Each website check takes ~0.5 seconds (rate limiting)
- 100 websites ≈ 1 minute
- Run without `--filter` for faster results (no website checking)

### SSL/Certificate errors
- Some websites have misconfigured SSL — these are skipped automatically
- The script continues checking other sites

---

## Data Sources

- **Business data**: [OpenStreetMap](https://www.openstreetmap.org/) via Overpass API
- **Geocoding**: Built-in US cities + Nominatim API fallback

All data is freely available and no API keys are required.

---

## Netlify Deployment (Automated Scraping)

Deploy to Netlify for automated hourly scraping that builds a database of leads over time.

### How It Works

- **Scheduled Function**: Runs every hour via Netlify Scheduled Functions
- **Rotation**: Cycles through all 14 categories × 50 cities (700 total combinations)
- **Storage**: Uses Netlify Blobs to store leads (persists across deploys)
- **Filtering**: Only saves businesses with Google Analytics or Facebook Pixel
- **Dashboard**: Web UI to view stats and download leads

### Deploy to Netlify

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add Netlify deployment"
   git push
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com) and sign in
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repo
   - Deploy settings are auto-detected from `netlify.toml`
   - Click "Deploy"

3. **Access Dashboard**:
   - Visit your Netlify URL (e.g., `https://your-site.netlify.app`)
   - Enter password: `ztas.io`
   - View stats, download leads as JSON or CSV

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Dashboard with stats and recent leads |
| `/.netlify/functions/get-leads?password=ztas.io` | Download all leads as JSON |
| `/.netlify/functions/get-leads?format=csv&password=ztas.io` | Download all leads as CSV |
| `/.netlify/functions/get-status?password=ztas.io` | Get current stats and history |

### Expected Results

- **Per hour**: ~5-15 qualified leads (businesses with GA/FB tracking)
- **Per day**: ~120-360 leads
- **Per week**: ~840-2,500 leads
- **Per month**: ~3,600-10,000 leads

The rotation ensures all city/category combinations get scraped over time.

### Costs

- **Netlify Free Tier**: 125k function invocations/month (hourly = 720/month)
- **Netlify Blobs**: 100GB free storage
- **External APIs**: OpenStreetMap is free, no rate limiting issues at this volume

---

## License

MIT
