import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { Pill, PlatformBadge } from '@/components/Pill';
import { categoryGradient } from '@/lib/categoryColor';
import { colors, radius } from '@/theme';
import type { SavedItem } from '@/store/types';

// Presentational card used by the deck and the onboarding demo.
// The gesture/physics live in the screens; this is just the face.
export function SwipeCardFace({
  item,
  style,
  compact = false,
}: {
  item: SavedItem;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const gradient = categoryGradient(item.category);
  const todosPreview = item.todos.slice(0, 2);
  const extraTodos = item.todos.length - todosPreview.length;

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: compact ? 90 : 170,
          padding: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <PlatformBadge platform={item.platform} />
        <Pill
          label={item.category ?? 'Unsorted'}
          color="rgba(255,255,255,0.28)"
          textColor="#FFFFFF"
        />
      </LinearGradient>

      <View style={{ padding: compact ? 12 : 18, gap: compact ? 6 : 12 }}>
        <AppText v={compact ? 'body' : 'heading'} numberOfLines={compact ? 2 : 3}>
          {item.summary ?? 'Processing...'}
        </AppText>

        {!compact && todosPreview.length > 0 && (
          <View style={{ gap: 8 }}>
            {todosPreview.map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: t.completed ? colors.success : colors.border,
                    backgroundColor: t.completed ? colors.success : 'transparent',
                  }}
                />
                <AppText v="caption" numberOfLines={1} style={{ flex: 1, color: colors.textSecondary }}>
                  {t.text}
                </AppText>
              </View>
            ))}
            {extraTodos > 0 && (
              <AppText v="caption" color={colors.primary}>
                +{extraTodos} more to-do{extraTodos === 1 ? '' : 's'}
              </AppText>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
