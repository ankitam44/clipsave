import React, { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { Pill, PlatformBadge } from '@/components/Pill';
import { SkeletonCard } from '@/components/Shimmer';
import { LoadingState } from '@/components/States';
import {
  useStore,
  selectPendingReady,
  selectProcessing,
  selectCategories,
  selectSavedThisWeek,
} from '@/store/useStore';
import { categoryGradient, categoryColor } from '@/lib/categoryColor';
import { greeting, homeEmpty, errors } from '@/lib/copy';
import { showToast } from '@/store/useToast';
import { colors, radius } from '@/theme';
import type { SavedItem } from '@/store/types';

export default function Home() {
  const hydrated = useStore((s) => s.hydrated);
  const hasOnboarded = useStore((s) => s.hasOnboarded);

  if (!hydrated) return <LoadingState label="Reading your saves..." />;
  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  return <Dashboard />;
}

function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useStore((s) => s.items);
  const stats = useStore((s) => s.stats);
  const pending = useStore(selectPendingReady);
  const processing = useStore(selectProcessing);
  const categories = useStore(selectCategories);
  const savedThisWeek = useStore(selectSavedThisWeek);
  const problemItems = items.filter(
    (it) =>
      (it.status === 'failed' || it.status === 'unsupported') && it.reviewStatus === 'unreviewed'
  );

  const hour = new Date().getHours();
  const isEmpty = items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText v="title">Swipefile</AppText>
            <PressableScale haptic onPress={() => router.push('/settings')} style={{ padding: 6 }}>
              <AppText style={{ fontSize: 22 }}>⚙️</AppText>
            </PressableScale>
          </View>
          <Animated.View entering={FadeInDown.springify()}>
            <AppText v="display">{greeting(hour, pending.length)}</AppText>
          </Animated.View>
          {stats.currentStreak > 0 && (
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <Pill
                label={`🔥 ${stats.currentStreak}-day swipe streak`}
                color={colors.surface}
                textColor={colors.text}
              />
            </Animated.View>
          )}
        </View>

        {isEmpty ? (
          <HomeEmptyState />
        ) : (
          <>
            {/* Pending queue */}
            <View style={{ marginTop: 26, gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 20,
                }}
              >
                <AppText v="heading">Waiting on you</AppText>
                {pending.length > 0 && (
                  <Pill label={`${pending.length} pending`} color={colors.primary} />
                )}
              </View>
              {pending.length === 0 && processing.length === 0 && problemItems.length === 0 ? (
                <View
                  style={{
                    marginHorizontal: 20,
                    backgroundColor: colors.surface,
                    borderRadius: radius.card,
                    padding: 20,
                  }}
                >
                  <AppText v="body" color={colors.textSecondary}>
                    Queue’s clear. Nothing is waiting on you. Frame this moment.
                  </AppText>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                >
                  {processing.map((item) => (
                    <View key={item.id}>
                      <SkeletonCard width={200} height={210} />
                      <AppText
                        v="caption"
                        style={{ position: 'absolute', bottom: 10, left: 14, right: 14 }}
                        numberOfLines={2}
                      >
                        Reading your save...
                      </AppText>
                    </View>
                  ))}
                  {pending.map((item, i) => (
                    <PendingCard key={item.id} item={item} index={i} onPress={() => router.push('/deck')} />
                  ))}
                  {problemItems.map((item) => (
                    <ProblemCard key={item.id} item={item} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Categories */}
            {categories.length > 0 && (
              <View style={{ marginTop: 28, paddingHorizontal: 20, gap: 12 }}>
                <AppText v="heading">Your piles</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {categories.map((cat, i) => (
                    <CategoryTile key={cat.name} name={cat.name} count={cat.count} index={i} />
                  ))}
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={{ marginTop: 28, paddingHorizontal: 20, gap: 12 }}>
              <AppText v="heading">Receipts</AppText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Saved this week" value={savedThisWeek} emoji="📥" />
                <StatCard label="To-dos done" value={stats.totalTodosCompleted} emoji="✅" />
                <StatCard label="Swipe streak" value={stats.currentStreak} emoji="🔥" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PendingCard({ item, index, onPress }: { item: SavedItem; index: number; onPress: () => void }) {
  const gradient = categoryGradient(item.category);
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <PressableScale haptic pressShadow onPress={onPress} style={{ width: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 6 } }}>
        <View
          style={{
            borderRadius: radius.card,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            height: 210,
          }}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 88, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <PlatformBadge platform={item.platform} />
          </LinearGradient>
          <View style={{ padding: 12, gap: 6, flex: 1 }}>
            <AppText v="caption" color={categoryColor(item.category)}>
              {item.category ?? 'Unsorted'}
            </AppText>
            <AppText v="body" numberOfLines={3} style={{ fontSize: 13, lineHeight: 18 }}>
              {item.summary}
            </AppText>
            <View style={{ flex: 1 }} />
            <AppText v="caption">
              {item.todos.length} to-do{item.todos.length === 1 ? '' : 's'} inside
            </AppText>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function ProblemCard({ item }: { item: SavedItem }) {
  const reprocessItem = useStore((s) => s.reprocessItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const unsupported = item.status === 'unsupported';
  return (
    <View
      style={{
        width: 200,
        height: 210,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 8,
      }}
    >
      <AppText style={{ fontSize: 26 }}>{unsupported ? '🚧' : '🫠'}</AppText>
      <AppText v="body" numberOfLines={4} style={{ fontSize: 13, lineHeight: 18 }}>
        {unsupported ? errors.unsupported : errors.processFailed}
      </AppText>
      <AppText v="caption" numberOfLines={1}>
        {item.url}
      </AppText>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {!unsupported && (
          <AppText
            v="caption"
            suppressHighlighting
            color={colors.primary}
            onPress={() => reprocessItem(item.id).catch(() => showToast(errors.processFailed, 'danger'))}
          >
            Retry
          </AppText>
        )}
        <AppText
          v="caption"
          suppressHighlighting
          color={colors.danger}
          onPress={() => deleteItem(item.id)}
        >
          Remove
        </AppText>
      </View>
    </View>
  );
}

function CategoryTile({ name, count, index }: { name: string; count: number; index: number }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tileW = (width - 40 - 12) / 2;
  const [start, end] = categoryGradient(name);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <PressableScale
        haptic
        pressShadow
        scaleTo={0.96}
        onPress={() => router.push({ pathname: '/category/[name]', params: { name } })}
        style={{ width: tileW, shadowColor: start, shadowOffset: { width: 0, height: 6 } }}
      >
        <LinearGradient
          colors={[start, end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.card, padding: 16, height: 110, justifyContent: 'space-between' }}
        >
          <AppText v="heading" color="#FFFFFF" numberOfLines={2}>
            {name}
          </AppText>
          <AppText v="caption" color="rgba(255,255,255,0.85)">
            {count} save{count === 1 ? '' : 's'}
          </AppText>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 14,
        gap: 4,
      }}
    >
      <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
      <AppText v="title">{value}</AppText>
      <AppText v="caption" numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

function HomeEmptyState() {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [bounce]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 14 }}>
      <Animated.Text entering={FadeInDown.springify()} style={{ fontSize: 60 }}>
        🪦
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <AppText v="title" style={{ textAlign: 'center' }}>
          {homeEmpty.title}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <AppText v="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {homeEmpty.body}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150).springify()} style={{ alignItems: 'center', marginTop: 18, gap: 8 }}>
        <Animated.Text style={[{ fontSize: 30 }, arrowStyle]}>⬇️</Animated.Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.pill,
            paddingHorizontal: 18,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AppText style={{ fontSize: 16 }}>📤</AppText>
          <AppText v="caption">{homeEmpty.hint}</AppText>
        </View>
      </Animated.View>
    </View>
  );
}
