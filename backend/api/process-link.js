const Anthropic = require('@anthropic-ai/sdk');

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
const INSTAGRAM_RE = /instagram\.com\/(?:reel|p)\/([^/?]+)/;
const TIKTOK_RE = /tiktok\.com\/@[^/]+\/video\/(\d+)/;

function detectPlatform(url) {
  if (YOUTUBE_RE.test(url)) return 'youtube';
  if (INSTAGRAM_RE.test(url)) return 'instagram';
  if (TIKTOK_RE.test(url)) return 'tiktok';
  return 'other';
}

async function getYouTubeContent(url, videoId) {
  // Get title + description via oEmbed (no API key required)
  const oembedRes = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  );
  if (!oembedRes.ok) throw new Error('YouTube video not found or private');
  const oembed = await oembedRes.json();

  // Try to fetch transcript via the unofficial captions endpoint
  let transcript = '';
  let transcriptAvailable = false;
  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(5000),
    });
    const html = await pageRes.text();
    // Extract the initial player response to look for captions
    const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (captionsMatch) {
      const tracks = JSON.parse(captionsMatch[1].replace(/\\u0026/g, '&'));
      const en = tracks.find((t) => t.languageCode === 'en') || tracks[0];
      if (en?.baseUrl) {
        const capRes = await fetch(en.baseUrl, { signal: AbortSignal.timeout(5000) });
        const xml = await capRes.text();
        // Strip XML tags and decode basic entities
        transcript = xml
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 6000);
        transcriptAvailable = transcript.length > 50;
      }
    }
  } catch {
    // Transcript is optional — carry on with title only
  }

  const content = transcriptAvailable
    ? `Title: ${oembed.title}\n\nTranscript excerpt:\n${transcript}`
    : `Title: ${oembed.title}\nChannel: ${oembed.author_name}`;

  return { title: oembed.title, content, transcriptAvailable };
}

async function getPageContent(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const og = (prop) => {
    const m =
      html.match(new RegExp(`<meta[^>]+property="og:${prop}"[^>]+content="([^"]+)"`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="og:${prop}"`, 'i'));
    return m?.[1] ?? '';
  };
  const title = og('title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || 'Untitled';
  const description = og('description');

  return {
    title: title.trim(),
    content: `Title: ${title}\n${description ? `Description: ${description}` : ''}`.trim(),
    transcriptAvailable: false,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  const platform = detectPlatform(url);

  let fetched;
  try {
    const videoId = url.match(YOUTUBE_RE)?.[1];
    if (platform === 'youtube' && videoId) {
      fetched = await getYouTubeContent(url, videoId);
    } else {
      fetched = await getPageContent(url);
    }
  } catch (err) {
    return res.status(422).json({ error: 'Could not read content', details: err.message });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const aiRes = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze this saved content and return a JSON object with exactly these fields:
- summary: 2-3 concise sentences about what this is
- keyTakeaways: array of 3-5 key points as plain strings
- todos: array of 3-5 specific actionable tasks as objects { "text": "...", "done": false }
- toolsMentioned: array of tools, apps, or products mentioned (empty array if none)
- category: one of Design, Marketing, Dev, Business, Health, Finance, Productivity, Other

Content to analyze:
${fetched.content.slice(0, 5000)}

Respond with only valid JSON. No markdown, no explanation.`,
      },
    ],
  });

  let parsed;
  try {
    parsed = JSON.parse(aiRes.content[0].text);
  } catch {
    // Claude sometimes wraps in ```json — strip it
    const stripped = aiRes.content[0].text.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return res.status(500).json({ error: 'AI response was not valid JSON' });
    }
  }

  return res.status(200).json({
    platform,
    summary: parsed.summary ?? '',
    keyTakeaways: parsed.keyTakeaways ?? [],
    todos: parsed.todos ?? [],
    toolsMentioned: parsed.toolsMentioned ?? [],
    category: parsed.category ?? 'Other',
    transcriptAvailable: fetched.transcriptAvailable,
  });
};
