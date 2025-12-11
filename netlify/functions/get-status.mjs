import { getStore } from "@netlify/blobs";

const PASSWORD = "ztas.io";

export default async (req, context) => {
  const url = new URL(req.url);

  // Check password
  const pass = url.searchParams.get('password') || req.headers.get('x-password');
  if (pass !== PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const store = getStore('leads');
  const stateStore = getStore('state');

  let leads = [];
  let state = { cityIndex: 0, categoryIndex: 0, totalRuns: 0 };
  let history = [];

  try {
    const leadsData = await store.get('all-leads', { type: 'json' });
    leads = leadsData || [];
  } catch {
    leads = [];
  }

  try {
    const stateData = await stateStore.get('rotation', { type: 'json' });
    state = stateData || state;
  } catch {}

  try {
    const historyData = await stateStore.get('history', { type: 'json' });
    history = historyData || [];
  } catch {}

  // Calculate stats
  const citiesScraped = new Set(leads.map(l => l.scrapedCity)).size;
  const withGA = leads.filter(l => l.hasGA).length;
  const withFB = leads.filter(l => l.hasFB).length;
  const withTracking = leads.filter(l => l.hasGA || l.hasFB).length;

  return new Response(JSON.stringify({
    totalLeads: leads.length,
    citiesScraped,
    withGA,
    withFB,
    withTracking,
    nextCityIndex: state.cityIndex,
    nextCategoryIndex: state.categoryIndex,
    totalRuns: state.totalRuns,
    recentLeads: leads.slice(-20).reverse(),
    history: history.slice(0, 20)
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
