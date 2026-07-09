export const colors = {
  bg: '#FFFFFF',
  surface: '#F7F7F8',
  primary: '#6C47FF',
  danger: '#FF6B6B',
  success: '#00C896',
  text: '#0D0D0D',
  textSecondary: '#666680',
  border: '#EDEDF0',
} as const;

export const radius = {
  card: 20,
  button: 12,
  pill: 100,
} as const;

export const font = {
  display: 'PlusJakartaSans_800ExtraBold',
  body: 'PlusJakartaSans_500Medium',
  caption: 'PlusJakartaSans_400Regular',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const platformColors: Record<string, string> = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#0D0D0D',
  unknown: '#666680',
};

export const platformLabels: Record<string, string> = {
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
  unknown: 'WEB',
};
