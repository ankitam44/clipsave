import React, { useEffect, useRef, useState } from 'react';
import { Platform, Share, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeInDown,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { SwipeCardFace } from '@/components/SwipeCard';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfettiRain } from '@/components/Confetti';
import { EmptyState, LoadingState } from '@/components/States';
import { useStore, selectPendingReady } from '@/store/useStore';
import { showToast } from '@/store/useToast';
import { deckCleared, deckEmpty, toasts } from '@/lib/copy';
import { colors } from '@/theme';
import type { SavedItem } from '@/store/types';

const SWIPE_THRESHOLD_RATIO = 0.3;

export default function Deck() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hydrated = useStore((s) => s.hydrated);
  const queue = useStore(selectPendingReady);
  const reviewItem = useStore((s) => s.reviewItem);

  const [keptItem, setKeptItem] = useState<SavedItem | null>(null);
  const [swipedThisSession, setSwipedThisSession] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const threshold = width * SWIPE_THRESHOLD_RATIO;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const top = queue[0];
  const cardW = width - 44;
  const cardH = Math.min(height * 0.62, 560);

  // New top card → snap the gesture values back without animating.
  useEffect(() => {
    tx.value = 0;
    ty.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id]);

  useEffect(
    () => () => {
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
    },
    []
  );

  const commit = (direction: 'kept' | 'archived') => {
    if (!top) return;
    const wasLast = queue.length === 1;
    reviewItem(top.id, direction);
    setSwipedThisSession((n) => n + 1);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        direction === 'kept'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }
    if (direction === 'kept') {
      setKeptItem(top);
    } else {
      showToast(toasts.archived, 'danger');
    }
    if (wasLast) {
      setShowConfetti(true);
      confettiTimer.current = setTimeout(() => setShowConfetti(false), 2200);
    }
  };

  const gesture = Gesture.Pan()
    .enabled(!!top)
    .activeOffsetX([-14, 14])
    .onChange((e) => {
      tx.value += e.changeX;
      ty.value += e.changeY * 0.4;
    })
    .onEnd((e) => {
      if (Math.abs(tx.value) > threshold) {
        const dir = tx.value > 0 ? 1 : -1;
        tx.value = withTiming(dir * width * 1.5, { duration: 260 }, (finished) => {
          if (finished) runOnJS(commit)(dir > 0 ? 'kept' : 'archived');
        });
        ty.value = withTiming(ty.value + e.velocityY * 0.05, { duration: 260 });
      } else {
        // Below threshold: spring back with a bounce (animation #1).
        tx.value = withSpring(0, { damping: 12, stiffness: 180 });
        ty.value = withSpring(0, { damping: 12, stiffness: 180 });
      }
    });

  // Top card: drag translation + proportional rotation.
  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, width], [-15, 15])}deg` },
    ],
  }));

  // Color overlays fade in with swipe distance.
  const keepOverlay = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, threshold], [0, 0.5], Extrapolation.CLAMP),
  }));
  const archiveOverlay = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-threshold, 0], [0.5, 0], Extrapolation.CLAMP),
  }));

  // Cards behind scale from 0.9 → 1.0 as the top card travels (animation #2).
  const secondCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(tx.value) / threshold, 1);
    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [0.9, 1]) },
        { translateY: interpolate(progress, [0, 1], [18, 0]) },
      ],
    };
  });
  const thirdCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(tx.value) / threshold, 1);
    return {
      transform: [
        { scale: interpolate(progress, [0, 1], [0.82, 0.9]) },
        { translateY: interpolate(progress, [0, 1], [34, 18]) },
      ],
    };
  });

  if (!hydrated) return <LoadingState label="Shuffling the deck..." />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <PressableScale haptic onPress={() => router.back()} style={{ padding: 6 }}>
          <AppText style={{ fontSize: 20 }}>✕</AppText>
        </PressableScale>
        <AppText v="heading">
          {queue.length > 0 ? `${queue.length} left to judge` : 'The deck'}
        </AppText>
        <View style={{ width: 32 }} />
      </View>

      {queue.length === 0 ? (
        swipedThisSession > 0 ? (
          <Celebration />
        ) : (
          <EmptyState emoji="🃏" title={deckEmpty.title} body={deckEmpty.body} action={{ label: 'Back home', onPress: () => router.back() }} />
        )
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* third card */}
          {queue[2] && (
            <Animated.View style={[{ position: 'absolute', width: cardW }, thirdCardStyle]}>
              <SwipeCardFace item={queue[2]} style={{ height: cardH }} />
            </Animated.View>
          )}
          {/* second card */}
          {queue[1] && (
            <Animated.View style={[{ position: 'absolute', width: cardW }, secondCardStyle]}>
              <SwipeCardFace item={queue[1]} style={{ height: cardH }} />
            </Animated.View>
          )}
          {/* top card */}
          <GestureDetector gesture={gesture}>
            <Animated.View style={[{ position: 'absolute', width: cardW }, topCardStyle]}>
              <PressableScale
                scaleTo={0.99}
                onPress={() => {
                  // A drag that ends past the card shouldn't count as a tap
                  // (the pan cancels presses on native, but not on web).
                  if (Math.abs(tx.value) > 10) return;
                  router.push({ pathname: '/item/[id]', params: { id: top.id } });
                }}
              >
                <View style={{ borderRadius: 20, overflow: 'hidden' }}>
                  <SwipeCardFace item={top} style={{ height: cardH }} />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.success,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      keepOverlay,
                    ]}
                  >
                    <AppText style={{ fontSize: 80, color: '#FFF' }}>✓</AppText>
                  </Animated.View>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      archiveOverlay,
                    ]}
                  >
                    <AppText style={{ fontSize: 80, color: '#FFF' }}>✕</AppText>
                  </Animated.View>
                </View>
              </PressableScale>
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {/* swipe hints */}
      {queue.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 36,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <AppText v="caption" color={colors.danger}>
            ← archive it
          </AppText>
          <AppText v="caption" color={colors.success}>
            keep the to-dos →
          </AppText>
        </View>
      )}

      {showConfetti && <ConfettiRain />}

      {/* Kept confirmation sheet with checkmark burst */}
      <BottomSheet visible={!!keptItem} onClose={() => setKeptItem(null)}>
        {keptItem && (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Animated.View
                entering={ZoomIn.springify().damping(8)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText style={{ fontSize: 32, color: '#FFF' }}>✓</AppText>
              </Animated.View>
              <AppText v="title">Kept. Here’s your homework.</AppText>
              <AppText v="caption" style={{ textAlign: 'center' }}>
                {toasts.kept}
              </AppText>
            </View>
            <View style={{ maxHeight: 260 }}>
              {keptItem.todos.length === 0 ? (
                <AppText v="body" color={colors.textSecondary} style={{ textAlign: 'center', paddingVertical: 10 }}>
                  No to-dos in this one. A rare freebie.
                </AppText>
              ) : (
                keptItem.todos.map((t, i) => (
                  <Animated.View
                    key={t.id}
                    entering={FadeInDown.delay(120 + i * 60).springify()}
                    style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, alignItems: 'center' }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 7,
                        borderWidth: 2,
                        borderColor: colors.border,
                      }}
                    />
                    <AppText v="body" style={{ flex: 1 }}>
                      {t.text}
                    </AppText>
                  </Animated.View>
                ))
              )}
            </View>
            <Button label="On it. Probably." kind="success" onPress={() => setKeptItem(null)} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function Celebration() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
      <Animated.Text entering={ZoomIn.springify().damping(8)} style={{ fontSize: 64 }}>
        🏆
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <AppText v="display" style={{ textAlign: 'center' }}>
          {deckCleared.title}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(160).springify()}>
        <AppText v="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {deckCleared.body}
        </AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(220).springify()} style={{ marginTop: 12, alignSelf: 'stretch' }}>
        <Button
          label={deckCleared.share}
          onPress={() => Share.share({ message: deckCleared.shareMessage }).catch(() => {})}
        />
      </Animated.View>
    </View>
  );
}
