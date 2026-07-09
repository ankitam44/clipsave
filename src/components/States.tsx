import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors } from '@/theme';

// Shared loading / error / empty states so no screen is ever a blank
// white rectangle.

export function LoadingState({ label = 'Warming up...' }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText v="caption">{label}</AppText>
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
      <Animated.Text entering={FadeInDown.springify()} style={{ fontSize: 56 }}>
        {emoji}
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <AppText v="title" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <AppText v="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {body}
        </AppText>
      </Animated.View>
      {action && (
        <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginTop: 10 }}>
          <Button label={action.label} onPress={action.onPress} />
        </Animated.View>
      )}
    </View>
  );
}

export function ErrorState({
  title = 'Something broke.',
  body,
  retry,
}: {
  title?: string;
  body: string;
  retry?: { label: string; onPress: () => void };
}) {
  return <EmptyState emoji="🫠" title={title} body={body} action={retry} />;
}
