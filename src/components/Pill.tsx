import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radius, platformColors, platformLabels } from '@/theme';
import type { ContentPlatform } from '@/store/types';

export function Pill({
  label,
  color = colors.primary,
  textColor = '#FFFFFF',
  style,
}: {
  label: string;
  color?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius.pill,
          paddingHorizontal: 12,
          paddingVertical: 5,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText v="caption" color={textColor} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
        {label}
      </AppText>
    </View>
  );
}

export function PlatformBadge({ platform }: { platform: ContentPlatform }) {
  return <Pill label={platformLabels[platform]} color={platformColors[platform]} />;
}
