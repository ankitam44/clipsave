import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  /** Animate shadow deeper while pressed (for tiles/cards). */
  pressShadow?: boolean;
  haptic?: boolean;
  children?: React.ReactNode;
}

// Shared spring-on-press wrapper: every tappable thing in the app
// squishes to `scaleTo` and bounces back. Nothing static allowed.
export function PressableScale({
  style,
  scaleTo = 0.96,
  pressShadow = false,
  haptic = false,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const base: Record<string, unknown> = {
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleTo]) }],
    };
    if (pressShadow) {
      base.shadowOpacity = interpolate(pressed.value, [0, 1], [0.1, 0.25]);
      base.shadowRadius = interpolate(pressed.value, [0, 1], [8, 16]);
      base.elevation = interpolate(pressed.value, [0, 1], [3, 8]);
    }
    return base as ViewStyle;
  });

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.value = withSpring(1, { damping: 18, stiffness: 380 });
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, { damping: 12, stiffness: 260 });
        onPressOut?.(e);
      }}
    />
  );
}
