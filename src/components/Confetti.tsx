import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const CONFETTI_COLORS = ['#6C47FF', '#FF6B6B', '#00C896', '#FFB020', '#2D9CDB', '#F2547D'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ---------- Micro burst: 5 dots flying out from a checkbox (animation #3) ----------

function BurstDot({ index }: { index: number }) {
  const progress = useSharedValue(0);
  const spec = useMemo(
    () => ({
      angle: rand(0, Math.PI * 2),
      distance: rand(22, 42),
      size: rand(4, 7),
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    }),
    [index]
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: progress.value * Math.cos(spec.angle) * spec.distance },
      { translateY: progress.value * Math.sin(spec.angle) * spec.distance },
      { scale: 1 - progress.value * 0.4 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

/** Mount (keyed) to fire a tiny particle burst at its parent's center. */
export function ConfettiBurst({ count = 5 }: { count?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <BurstDot key={i} index={i} />
      ))}
    </View>
  );
}

// ---------- Full-screen rain for the empty-deck celebration (animation #4) ----------

function RainPiece({ screenW, screenH, index }: { screenW: number; screenH: number; index: number }) {
  const progress = useSharedValue(0);
  const spec = useMemo(
    () => ({
      x: rand(0, screenW),
      delay: rand(0, 500),
      duration: rand(1300, 2100),
      drift: rand(-60, 60),
      spin: rand(2, 6) * (Math.random() > 0.5 ? 1 : -1),
      w: rand(6, 11),
      h: rand(10, 16),
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index]
  );

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) })
    );
  }, [progress, spec]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.85 ? 1 : (1 - progress.value) / 0.15,
    transform: [
      { translateX: spec.x + progress.value * spec.drift },
      { translateY: -40 + progress.value * (screenH + 80) },
      { rotate: `${progress.value * spec.spin * 60}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: spec.w,
          height: spec.h,
          borderRadius: 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}

/** Mount to rain confetti over the whole screen for ~2 seconds. */
export function ConfettiRain({ count = 44 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <RainPiece key={i} index={i} screenW={width} screenH={height} />
      ))}
    </View>
  );
}
