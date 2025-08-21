// api/kit-subscriber-count.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lock CORS to your Ghost(Pro) domain
  res.setHeader('Access-Control-Allow-Origin', 'https://YOUR-GHOST-DOMAIN'); // e.g., https://yourblog.ghost.io or your custom domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Cache at the edge for 5 minutes (adjust as you like)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    const apiKey = process.env.KIT_API_KEY; // set in Vercel → Project → Settings → Environment Variables
    if (!apiKey) return res.status(500).json({ error: 'Missing KIT_API_KEY' });

    // Call Kit v4 growth stats over a wide window to get a current “subscribers” figure
    const url = new URL('https://api.kit.com/v4/account/growth_stats');
    const today = new Date().toISOString().slice(0, 10);
    url.searchParams.set('starting', '2015-01-01'); // adjust earlier if needed
    url.searchParams.set('ending', today);

    const r = await fetch(url.toString(), { headers: { 'X-Kit-Api-Key': apiKey } });
    if (!r.ok) {
      return res.status(r.status).json({ error: 'Kit API error', details: await r.text() });
    }

    const data = await r.json();
    const count = data?.stats?.subscribers ?? null;

    return res.status(200).json({ subscribers: count });
  } catch (e: any) {
    return res.status(500).json({ error: 'Unhandled error', details: e?.message });
  }
}
