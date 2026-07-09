import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeInLeft,
  ZoomIn,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, radius } from '@/theme';
import { useStore } from '@/store/useStore';
import { requestNotificationPermission } from '@/lib/notifications';

// ---------- Page 1 illustration: a phone whose saved folder grew cobwebs ----------

function CobwebPhone({ active }: { active: boolean }) {
  if (!active) return <View style={{ height: 240 }} />;
  return (
    <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        entering={FadeInDown.springify().damping(14)}
        style={{
          width: 130,
          height: 230,
          borderRadius: 28,
          borderWidth: 5,
          borderColor: colors.text,
          backgroundColor: colors.surface,
          alignItems: 'center',
          paddingTop: 34,
          gap: 10,
        }}
      >
        <Animated.Text entering={FadeInDown.delay(50).springify()} style={{ fontSize: 44 }}>
          📁
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).springify()} style={{ fontSize: 13 }}>
          Saved · 247
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(150).springify()}
          style={{ fontSize: 34, position: 'absolute', top: 6, left: 8 }}
        >
          🕸️
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(200).springify()}
          style={{ fontSize: 30, position: 'absolute', top: 60, right: 6 }}
        >
          🕸️
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(250).springify()}
          style={{ fontSize: 26, position: 'absolute', bottom: 14, left: 14 }}
        >
          🕷️
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

// ---------- Page 2: looping share → process → to-do demo ----------

function TickingTodo({ text, delay }: { text: string; delay: number }) {
  const done = useSharedValue(0);
  useEffect(() => {
    done.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 260 }));
  }, [done, delay]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: done.value > 0.5 ? colors.success : colors.bg,
    borderColor: done.value > 0.5 ? colors.success : colors.border,
    transform: [{ scale: interpolate(done.value, [0, 0.6, 1], [1, 1.25, 1]) }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: done.value > 0.5 ? 1 : 0 }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
      <Animated.View
        style={[
          { width: 20, height: 20, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
          boxStyle,
        ]}
      >
        <Animated.Text style={[{ color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' }, checkStyle]}>
          ✓
        </Animated.Text>
      </Animated.View>
      <AppText v="caption" style={{ color: colors.text }}>
        {text}
      </AppText>
    </View>
  );
}

function ShareDemo({ active }: { active: boolean }) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setCycle((c) => c + 1), 4200);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return <View style={{ height: 300 }} />;

  return (
    <View key={cycle} style={{ height: 300, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Animated.View
        entering={FadeInDown.springify().damping(14)}
        style={{
          backgroundColor: colors.text,
          borderRadius: radius.pill,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <AppText v="caption" color="#FFF">
          🔗 youtube.com/watch?v=how-to-ship...
        </AppText>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(300)} style={{ fontSize: 20 }}>
        ⬇️
      </Animated.Text>
      <Animated.View
        entering={ZoomIn.delay(600).springify().damping(9)}
        style={{
          width: 250,
          backgroundColor: colors.bg,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          gap: 6,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }}
      >
        <AppText v="heading">Ship your side project</AppText>
        <TickingTodo text="Pick one feature. Just one." delay={1300} />
        <TickingTodo text="Set up the repo tonight" delay={1750} />
        <TickingTodo text="Post progress by Friday" delay={2200} />
      </Animated.View>
    </View>
  );
}

// ---------- Page 3: a card you can actually swipe ----------

const DEMO_CARDS = [
  { emoji: '🍜', title: '15-min ramen upgrade', hint: 'Swipe right to keep the to-dos' },
  { emoji: '🎨', title: 'Figma auto-layout in 60s', hint: 'Swipe left to archive it' },
];

function PracticeCard({ active }: { active: boolean }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 96, 300);
  const threshold = width * 0.3;
  const tx = useSharedValue(0);
  const [round, setRound] = useState(0);
  const [lastResult, setLastResult] = useState<'kept' | 'archived' | null>(null);
  const card = DEMO_CARDS[round % DEMO_CARDS.length];

  const commit = (dir: 'kept' | 'archived') => {
    setLastResult(dir);
    setRound((r) => r + 1);
    tx.value = 0;
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onChange((e) => {
      tx.value += e.changeX;
    })
    .onEnd(() => {
      if (Math.abs(tx.value) > threshold) {
        const dir = tx.value > 0 ? 1 : -1;
        tx.value = withTiming(dir * width * 1.3, { duration: 230 }, (finished) => {
          if (finished) runOnJS(commit)(dir > 0 ? 'kept' : 'archived');
        });
      } else {
        tx.value = withSpring(0, { damping: 13, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-width, width], [-15, 15])}deg` },
    ],
  }));
  const keepGlow = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, threshold], [0, 0.55], Extrapolation.CLAMP),
  }));
  const archiveGlow = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-threshold, 0], [0.55, 0], Extrapolation.CLAMP),
  }));

  if (!active) return <View style={{ height: 300 }} />;

  return (
    <View style={{ height: 300, alignItems: 'center', justifyContent: 'center' }}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          key={round}
          entering={ZoomIn.springify().damping(11)}
          style={[
            {
              width: cardW,
              height: 220,
              borderRadius: radius.card,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              shadowColor: '#000',
              shadowOpacity: 0.14,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
              overflow: 'hidden',
            },
            cardStyle,
          ]}
        >
          <AppText style={{ fontSize: 52 }}>{card.emoji}</AppText>
          <AppText v="heading">{card.title}</AppText>
          <AppText v="caption">{card.hint}</AppText>
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
              keepGlow,
            ]}
          >
            <AppText style={{ fontSize: 60, color: '#FFF' }}>✓</AppText>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
              archiveGlow,
            ]}
          >
            <AppText style={{ fontSize: 60, color: '#FFF' }}>✕</AppText>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {lastResult && (
        <Animated.View key={`r-${round}`} entering={FadeInDown.springify()} style={{ position: 'absolute', bottom: 0 }}>
          <AppText v="caption" color={lastResult === 'kept' ? colors.success : colors.danger}>
            {lastResult === 'kept'
              ? 'Kept. The to-dos are yours now.'
              : 'Archived. It had a good run.'}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

// ---------- The pager ----------

const PAGES = [
  {
    title: 'Your saves are a graveyard',
    body: '247 tutorials saved. 3 watched. The folder has cobwebs and honestly, so does the ambition. We can fix this.',
    cta: 'Yeah, that’s me',
  },
  {
    title: 'Drop a link. Get a to-do list.',
    body: 'Share any video or post into Swipefile. The AI watches it so you know exactly what to do — before you even press play.',
    cta: 'That’s actually useful',
  },
  {
    title: 'Swipe your way out of the backlog',
    body: 'Right means “watched it, keep the to-dos.” Left means “archive, we don’t speak of it.” Try it on this card.',
    cta: 'Let’s go',
  },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activePage, setActivePage] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    runOnJS(setActivePage)(Math.round(e.contentOffset.x / width));
  });

  const goTo = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * width, animated: true });
  };

  const finish = async () => {
    completeOnboarding();
    router.replace('/');
    requestNotificationPermission().catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        ref={scrollRef as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {PAGES.map((page, i) => (
          <OnboardingPage
            key={page.title}
            index={i}
            width={width}
            height={height}
            scrollX={scrollX}
            title={page.title}
            body={page.body}
            cta={page.cta}
            active={activePage === i}
            onCta={() => (i === 2 ? finish() : goTo(i + 1))}
            topInset={insets.top}
            bottomInset={insets.bottom}
          />
        ))}
      </Animated.ScrollView>

      {/* page dots */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 118,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
        pointerEvents="none"
      >
        {PAGES.map((_, i) => (
          <Dot key={i} index={i} scrollX={scrollX} width={width} />
        ))}
      </View>
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: Animated.SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const p = scrollX.value / width;
    return {
      width: interpolate(p, [index - 1, index, index + 1], [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(p, [index - 1, index, index + 1], [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 4, backgroundColor: colors.primary }, style]}
    />
  );
}

function OnboardingPage({
  index,
  width,
  height,
  scrollX,
  title,
  body,
  cta,
  active,
  onCta,
  topInset,
  bottomInset,
}: {
  index: number;
  width: number;
  height: number;
  scrollX: Animated.SharedValue<number>;
  title: string;
  body: string;
  cta: string;
  active: boolean;
  onCta: () => void;
  topInset: number;
  bottomInset: number;
}) {
  // Slide + fade as pages move (animation #6): content parallaxes at
  // half scroll speed and fades at the edges.
  const pageStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * width;
    return {
      opacity: interpolate(offset, [-width, 0, width], [0.15, 1, 0.15], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(offset, [-width, 0, width], [width * 0.35, 0, -width * 0.35]) }],
    };
  });

  return (
    <View style={{ width, height, paddingTop: topInset + 40, paddingBottom: bottomInset + 24, paddingHorizontal: 28 }}>
      <Animated.View style={[{ flex: 1 }, pageStyle]}>
        {index === 0 && <CobwebPhone active={active} />}
        {index === 1 && <ShareDemo active={active} />}
        {index === 2 && <PracticeCard active={active} />}

        {active && (
          <View style={{ marginTop: 28, gap: 12 }}>
            <Animated.View entering={FadeInLeft.delay(100).springify()}>
              <AppText v="display">{title}</AppText>
            </Animated.View>
            <Animated.View entering={FadeInLeft.delay(150).springify()}>
              <AppText v="body" color={colors.textSecondary}>
                {body}
              </AppText>
            </Animated.View>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Button label={cta} onPress={onCta} />
      </Animated.View>
    </View>
  );
}
