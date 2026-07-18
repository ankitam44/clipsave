import React from 'react';
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { AppText } from '@/components/AppText';
import { colors, radius } from '@/theme';

type Kind = 'primary' | 'success' | 'danger' | 'ghost';

const bg: Record<Kind, string> = {
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  ghost: colors.surface,
};

interface Props {
  label: string;
  onPress: () => void;
  kind?: Kind;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, kind = 'primary', loading, disabled, style }: Props) {
  const textColor = kind === 'ghost' ? colors.text : '#FFFFFF';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic
      scaleTo={0.95}
      style={[
        {
          backgroundColor: bg[kind],
          borderRadius: radius.button,
          paddingVertical: 15,
          paddingHorizontal: 22,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText v="heading" color={textColor}>
          {label}
        </AppText>
      )}
    </PressableScale>
  );
}
