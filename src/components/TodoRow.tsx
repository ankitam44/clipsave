import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/AppText';
import { ConfettiBurst } from '@/components/Confetti';
import { colors } from '@/theme';
import type { TodoItem } from '@/store/types';

// Checkbox with scale-bounce + confetti burst on completion (animation #3).
export function TodoRow({ todo, onToggle }: { todo: TodoItem; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const [burstKey, setBurstKey] = useState(0);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (!todo.completed) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 9, stiffness: 320 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      );
      setBurstKey((k) => k + 1);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = withSequence(
        withSpring(0.85, { damping: 12, stiffness: 320 }),
        withSpring(1, { damping: 12, stiffness: 260 })
      );
    }
    onToggle();
  };

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
      }}
    >
      <Animated.View style={boxStyle}>
        <AppText
          onPress={handlePress}
          suppressHighlighting
          style={{
            width: 26,
            height: 26,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: todo.completed ? colors.success : colors.border,
            backgroundColor: todo.completed ? colors.success : colors.bg,
            textAlign: 'center',
            lineHeight: 23,
            fontSize: 14,
            color: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          {todo.completed ? '✓' : ' '}
        </AppText>
        {burstKey > 0 && <ConfettiBurst key={burstKey} />}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <AppText
          v="body"
          onPress={handlePress}
          suppressHighlighting
          style={{
            textDecorationLine: todo.completed ? 'line-through' : 'none',
            color: todo.completed ? colors.textSecondary : colors.text,
          }}
        >
          {todo.text}
        </AppText>
      </View>
    </Animated.View>
  );
}
