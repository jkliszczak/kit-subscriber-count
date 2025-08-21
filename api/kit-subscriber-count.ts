// api/kit-subscriber-count.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow your Ghost site (adjust if you also use the ghost.io subdomain)
  const ALLOWED = ['https://www.jeffsu.org'];
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    const apiKey = process.env.KIT_API_KEY;
    const tagId  = process.env.KIT_TAG_ID || req.query.tag_id as string; // choose either env or query
    if (!apiKey) return res.status(500).json({ error: 'Missing KIT_API_KEY' });
    if (!tagId)  return res.status(400).json({ error: 'Missing tag_id (set KIT_TAG_ID or pass ?tag_id=...)' });

    // Kit v4: list subscribers for a tag, request total count
    const url = new URL(`https://api.kit.com/v4/tags/${encodeURIComponent(tagId)}/subscribers`);
    url.searchParams.set('include_total_count', 'true'); // v4 pagination guide
    // Optional: you can also set per_page to a small number since we only need the count:
    url.searchParams.set('per_page', '1');

    const r = await fetch(url.toString(), { headers: { 'X-Kit-Api-Key': apiKey } });
    if (!r.ok) return res.status(r.status).json({ error: 'Kit API error', details: await r.text() });

    const data = await r.json();

    // v4 responses include a pagination object; grab total_count if present.
    const total =
      data?.pagination?.total_count ??
      data?.total_count ??
      (Array.isArray(data?.subscribers) ? data.subscribers.length : null);

    return res.status(200).json({ subscribers: total, tag_id: tagId });
  } catch (e: any) {
    return res.status(500).json({ error: 'Unhandled error', details: e?.message });
  }
}
