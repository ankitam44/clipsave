import type { ContentPlatform } from '@/store/types';

// Quick local guess so the card shows the right badge while the
// backend is still processing. Backend response wins once it lands.
export function guessPlatform(url: string): ContentPlatform {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  return 'unknown';
}

// Turn a YouTube watch/share URL into an embeddable player URL for the
// detail view. Other platforms load their original URL in the webview.
export function embedUrl(url: string, platform: ContentPlatform): string {
  if (platform !== 'youtube') return url;
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname.includes('youtu.be')) {
      id = parsed.pathname.slice(1).split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      id = parsed.pathname.split('/')[2] ?? null;
    } else {
      id = parsed.searchParams.get('v');
    }
    return id ? `https://www.youtube.com/embed/${id}` : url;
  } catch {
    return url;
  }
}
