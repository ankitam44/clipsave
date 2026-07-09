import * as Linking from 'expo-linking';

const URL_RE = /(https?:\/\/[^\s"'<>]+)/i;

// Hosts that mean "this is the dev/runtime URL, not shared content".
const IGNORED_HOSTS = ['expo.dev', 'expo.io', 'localhost', '127.0.0.1', '10.0.2.2'];

function isIgnorable(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return IGNORED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return true;
  }
}

/**
 * Pull a shareable content URL out of whatever arrived through the
 * share sheet / deep link. Handles:
 *  - swipefile://save?url=<encoded url>
 *  - raw shared text containing an http(s) link (Android ACTION_SEND)
 *  - a plain https:// link opened straight into the app
 * Returns null for the app's own dev-client / expo URLs.
 */
export function extractSharedUrl(incoming: string | null): string | null {
  if (!incoming) return null;

  // Explicit deep link with a url param always wins.
  try {
    const parsed = Linking.parse(incoming);
    const q = parsed.queryParams?.url;
    if (typeof q === 'string' && URL_RE.test(q)) {
      const match = q.match(URL_RE);
      if (match && !isIgnorable(match[1])) return match[1];
    }
  } catch {
    // fall through to regex scan
  }

  // Expo Go / dev-client launch URLs are not shared content.
  if (/^exps?:\/\//i.test(incoming) || incoming.startsWith('swipefile://')) {
    // swipefile:// without a url param (e.g. notification deep link) is
    // navigation, not content.
    return null;
  }

  const match = incoming.match(URL_RE);
  if (!match) return null;
  return isIgnorable(match[1]) ? null : match[1];
}
