// Every category gets a stable color pair derived from its name, so
// "AI Tools" is the same violet on every screen, every launch.
const PALETTE: [string, string][] = [
  ['#6C47FF', '#9B7BFF'], // electric violet
  ['#FF6B6B', '#FF9F7B'], // coral
  ['#00C896', '#4BE3B8'], // mint
  ['#FF8A3D', '#FFB35C'], // tangerine
  ['#2D9CDB', '#6FC3F7'], // sky
  ['#F2547D', '#FF8AA8'], // raspberry
  ['#00B8D9', '#5EDFF5'], // cyan
  ['#FFB020', '#FFD066'], // amber
  ['#8F5BFF', '#C09BFF'], // grape
  ['#0FA968', '#3ED598'], // forest mint
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function categoryGradient(name: string | null): [string, string] {
  const key = (name ?? 'Unsorted').trim().toLowerCase();
  return PALETTE[hashString(key) % PALETTE.length];
}

export function categoryColor(name: string | null): string {
  return categoryGradient(name)[0];
}
