import React from 'react';
import { View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast, ToastKind } from '@/store/useToast';
import { AppText } from '@/components/AppText';
import { colors } from '@/theme';

const kindColor: Record<ToastKind, string> = {
  success: colors.success,
  danger: colors.danger,
  info: colors.primary,
  neutral: colors.text,
};

// Global toast stack, rendered once in the root layout above everything.
export function ToastHost() {
  const toasts = useToast((s) => s.toasts);
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 24,
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <Animated.View
          key={t.id}
          entering={SlideInDown.springify().damping(16)}
          exiting={SlideOutDown.duration(220)}
          layout={Layout.springify()}
          style={{
            backgroundColor: kindColor[t.kind],
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 13,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <AppText v="body" color="#FFFFFF">
            {t.message}
          </AppText>
        </Animated.View>
      ))}
    </View>
  );
}
