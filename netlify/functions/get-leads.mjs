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
  const format = url.searchParams.get('format') || 'json';

  let leads = [];
  try {
    const data = await store.get('all-leads', { type: 'json' });
    leads = data || [];
  } catch {
    leads = [];
  }

  if (format === 'csv') {
    // Generate CSV
    const headers = [
      'Business Name', 'Category', 'Website', 'Phone', 'Email',
      'Address', 'City', 'State', 'Has GA?', 'Has FB Pixel?',
      'Scraped At', 'Source'
    ];

    const escape = (field) => {
      const str = String(field || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = leads.map(l => [
      l.name, l.category, l.website, l.phone, l.email,
      l.address, l.city, l.state,
      l.hasGA ? 'YES' : '', l.hasFB ? 'YES' : '',
      l.scrapedAt, l.source
    ]);

    const csv = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  }

  // Default: JSON
  return new Response(JSON.stringify(leads, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
