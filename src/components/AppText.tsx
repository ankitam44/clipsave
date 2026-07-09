import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, font } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 37, color: colors.text },
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.text },
  heading: { fontFamily: font.display, fontSize: 16, lineHeight: 22, color: colors.text },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontFamily: font.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
};

interface Props extends TextProps {
  v?: Variant;
  color?: string;
}

export function AppText({ v = 'body', color, style, ...rest }: Props) {
  return <Text {...rest} style={[variants[v], color ? { color } : null, style]} />;
}
