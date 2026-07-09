import React, { useEffect, useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';

// Skeleton block with a left-to-right gradient sweep (animation #7).
export function Shimmer({
  style,
  borderRadius = 8,
}: {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(-1);

  useEffect(() => {
    progress.value = -1;
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * width }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ backgroundColor: colors.border, overflow: 'hidden', borderRadius }, style]}
    >
      {width > 0 && (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width }, sweep]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}

// Skeleton save card shown while the backend reads a shared link.
export function SkeletonCard({ width = 200, height = 200 }: { width?: number; height?: number }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 20,
        backgroundColor: colors.surface,
        padding: 14,
        gap: 10,
      }}
    >
      <Shimmer style={{ height: height * 0.42 }} borderRadius={12} />
      <Shimmer style={{ height: 14, width: '85%' }} />
      <Shimmer style={{ height: 14, width: '60%' }} />
      <Shimmer style={{ height: 12, width: '40%' }} borderRadius={6} />
    </View>
  );
}
