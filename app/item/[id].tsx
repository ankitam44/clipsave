import React, { useState } from 'react';
import { Linking, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Pill, PlatformBadge } from '@/components/Pill';
import { TodoRow } from '@/components/TodoRow';
import { Shimmer } from '@/components/Shimmer';
import { ErrorState, LoadingState } from '@/components/States';
import { useStore } from '@/store/useStore';
import { showToast } from '@/store/useToast';
import { categoryGradient, categoryColor } from '@/lib/categoryColor';
import { embedUrl } from '@/lib/platform';
import { errors, processing as processingCopy, toasts } from '@/lib/copy';
import { colors, radius } from '@/theme';

const TABS = ['To-dos', 'Summary', 'Tools'] as const;
type Tab = (typeof TABS)[number];

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hydrated = useStore((s) => s.hydrated);
  const item = useStore((s) => s.items.find((it) => it.id === id));
  const toggleTodo = useStore((s) => s.toggleTodo);
  const reviewItem = useStore((s) => s.reviewItem);
  const reprocessItem = useStore((s) => s.reprocessItem);
  const [tab, setTab] = useState<Tab>('To-dos');
  const [webViewFailed, setWebViewFailed] = useState(false);

  if (!hydrated) return <LoadingState label="Finding that save..." />;

  if (!item) {
    return (
      <ErrorState
        title="Save not found"
        body={errors.itemMissing}
        retry={{ label: 'Back to safety', onPress: () => router.back() }}
      />
    );
  }

  if (item.status === 'processing' || item.status === 'pending') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
        <Header onBack={() => router.back()} title="Processing" />
        <View style={{ padding: 20, gap: 14 }}>
          <Shimmer style={{ height: 210 }} borderRadius={radius.card} />
          <Shimmer style={{ height: 18, width: '80%' }} />
          <Shimmer style={{ height: 18, width: '60%' }} />
          <AppText v="caption" style={{ textAlign: 'center', marginTop: 10 }}>
            {processingCopy}
          </AppText>
        </View>
      </View>
    );
  }

  if (item.status === 'failed' || item.status === 'unsupported') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
        <Header onBack={() => router.back()} title="Hmm." />
        <ErrorState
          title={item.status === 'unsupported' ? 'Not supported (yet)' : 'Couldn’t read this one'}
          body={item.status === 'unsupported' ? errors.unsupported : errors.processFailed}
          retry={
            item.status === 'failed'
              ? {
                  label: 'Try again',
                  onPress: () => {
                    showToast(toasts.reprocessing, 'info');
                    reprocessItem(item.id).catch(() => showToast(errors.processFailed, 'danger'));
                  },
                }
              : { label: 'Open the original', onPress: () => Linking.openURL(item.url) }
          }
        />
      </View>
    );
  }

  const gradient = categoryGradient(item.category);
  const completed = item.todos.filter((t) => t.completed).length;
  const isDone = item.reviewStatus === 'kept';
  const playerH = Math.min(width * 0.56, 260);

  const markWatched = () => {
    reviewItem(item.id, 'kept');
    showToast(toasts.kept, 'success');
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <Header
        onBack={() => router.back()}
        title={item.category ?? 'Unsorted'}
        right={<PlatformBadge platform={item.platform} />}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Player */}
        <View style={{ marginHorizontal: 20, borderRadius: radius.card, overflow: 'hidden', height: playerH }}>
          {Platform.OS === 'web' || webViewFailed ? (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <AppText style={{ fontSize: 40 }}>▶️</AppText>
              <PressableScale haptic onPress={() => Linking.openURL(item.url)}>
                <Pill label="Open the original" color="rgba(255,255,255,0.3)" />
              </PressableScale>
            </LinearGradient>
          ) : (
            <WebView
              source={{ uri: embedUrl(item.url, item.platform) }}
              style={{ flex: 1, backgroundColor: colors.surface }}
              allowsFullscreenVideo
              onError={() => setWebViewFailed(true)}
              startInLoadingState
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <Shimmer style={{ flex: 1 }} borderRadius={0} />
                </View>
              )}
            />
          )}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginTop: 18,
            backgroundColor: colors.surface,
            borderRadius: radius.pill,
            padding: 4,
          }}
        >
          {TABS.map((t) => (
            <TabButton key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          {tab === 'To-dos' && (
            <Animated.View entering={FadeIn.duration(180)} style={{ gap: 8 }}>
              {item.todos.length === 0 ? (
                <AppText v="body" color={colors.textSecondary}>
                  No to-dos in this one. Pure entertainment, apparently.
                </AppText>
              ) : (
                <>
                  <ProgressBar completed={completed} total={item.todos.length} />
                  {item.todos.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      onToggle={() => {
                        toggleTodo(item.id, t.id);
                        if (!t.completed && completed + 1 === item.todos.length) {
                          showToast(toasts.todoAllDone, 'success');
                        }
                      }}
                    />
                  ))}
                </>
              )}
            </Animated.View>
          )}

          {tab === 'Summary' && (
            <Animated.View entering={FadeIn.duration(180)} style={{ gap: 16 }}>
              <AppText v="body">{item.summary}</AppText>
              {item.keyTakeaways.length > 0 && (
                <View style={{ gap: 10 }}>
                  <AppText v="heading">Key takeaways</AppText>
                  {item.keyTakeaways.map((k, i) => (
                    <Animated.View
                      key={i}
                      entering={FadeInDown.delay(i * 50).springify()}
                      style={{ flexDirection: 'row', gap: 10 }}
                    >
                      <AppText v="body" color={categoryColor(item.category)}>
                        •
                      </AppText>
                      <AppText v="body" style={{ flex: 1 }}>
                        {k}
                      </AppText>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {tab === 'Tools' && (
            <Animated.View entering={FadeIn.duration(180)}>
              {item.toolsMentioned.length === 0 ? (
                <AppText v="body" color={colors.textSecondary}>
                  No tools mentioned. Just vibes and information.
                </AppText>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {item.toolsMentioned.map((tool, i) => (
                    <Animated.View key={`${tool.name}-${i}`} entering={FadeInDown.delay(i * 50).springify()}>
                      <PressableScale
                        haptic
                        onPress={() =>
                          Linking.openURL(
                            `https://www.google.com/search?q=${encodeURIComponent(tool.name)}`
                          )
                        }
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: radius.pill,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <AppText v="body">🔧 {tool.name}</AppText>
                      </PressableScale>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 20,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {isDone ? (
          <Button label="✓ Watched. To-dos unlocked." kind="ghost" onPress={() => router.back()} />
        ) : (
          <Button label="Mark as watched" kind="success" onPress={markWatched} />
        )}
      </View>
    </View>
  );
}

function Header({ onBack, title, right }: { onBack: () => void; title: string; right?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
      }}
    >
      <PressableScale haptic onPress={onBack} style={{ padding: 6 }}>
        <AppText style={{ fontSize: 20 }}>←</AppText>
      </PressableScale>
      <AppText v="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </AppText>
      <View style={{ minWidth: 32, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      haptic
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 100,
        paddingVertical: 9,
        alignItems: 'center',
        backgroundColor: active ? colors.text : 'transparent',
      }}
    >
      <AppText v="caption" color={active ? '#FFFFFF' : colors.textSecondary} style={{ fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : completed / total;
  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${Math.round(pct * 100)}%`, { damping: 16, stiffness: 160 }),
  }));
  return (
    <View style={{ gap: 6, marginBottom: 6 }}>
      <AppText v="caption">
        {completed}/{total} done {completed === total && total > 0 ? '— show-off' : ''}
      </AppText>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.success }, barStyle]} />
      </View>
    </View>
  );
}
