import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { Pill } from '@/components/Pill';
import { useStore } from '@/store/useStore';
import { showToast } from '@/store/useToast';
import { extractAllUrls } from '@/lib/share';
import { colors, font, radius } from '@/theme';

type Phase = 'paste' | 'working' | 'done';

// "Rescue mission": paste everything you copied out of your saves folder
// and Swipefile reads all of it. This is the productized version of the
// viral "paste your saves into ChatGPT with this prompt" workflow — same
// input, none of the manual steps.
export default function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addItemFromUrl = useStore((s) => s.addItemFromUrl);

  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('paste');
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [total, setTotal] = useState(0);

  const urls = useMemo(() => extractAllUrls(text), [text]);

  const runImport = async () => {
    const queue = [...urls];
    setTotal(queue.length);
    setDone(0);
    setFailed(0);
    setPhase('working');

    // Three links in flight at a time: fast enough for a big paste,
    // gentle enough on the backend.
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length > 0) {
        const url = queue.shift()!;
        try {
          await addItemFromUrl(url);
          setDone((d) => d + 1);
        } catch {
          setFailed((f) => f + 1);
        }
      }
    });
    await Promise.all(workers);
    setPhase('done');
  };

  const finish = () => {
    showToast('Rescue complete. The deck awaits.', 'success');
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, gap: 12 }}>
        <PressableScale haptic onPress={() => router.back()} style={{ padding: 6 }} disabled={phase === 'working'}>
          <AppText style={{ fontSize: 20 }}>←</AppText>
        </PressableScale>
        <AppText v="title">Saves rescue mission</AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'paste' && (
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <AppText v="body" color={colors.textSecondary}>
                Open your saved folder on Instagram, TikTok, or YouTube, copy the links (share →
                copy link, as many as you want), and dump them all here. We’ll read every single
                one so you don’t have to.
              </AppText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).springify()}>
              <TextInput
                multiline
                value={text}
                onChangeText={setText}
                placeholder={'https://youtube.com/watch?v=...\nhttps://instagram.com/reel/...\nhttps://tiktok.com/@.../video/...'}
                placeholderTextColor={colors.textSecondary}
                style={{
                  minHeight: 180,
                  backgroundColor: colors.surface,
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  fontFamily: font.body,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.text,
                  textAlignVertical: 'top',
                }}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12 }}>
              {text.trim().length > 0 && urls.length === 0 ? (
                <AppText v="caption" color={colors.danger}>
                  No links found in there yet. Paste actual URLs — the vibes alone aren’t enough.
                </AppText>
              ) : (
                urls.length > 0 && (
                  <Pill
                    label={`${urls.length} link${urls.length === 1 ? '' : 's'} found`}
                    color={colors.primary}
                  />
                )
              )}
              <Button
                label={
                  urls.length === 0
                    ? 'Paste some links first'
                    : `Rescue ${urls.length} save${urls.length === 1 ? '' : 's'}`
                }
                disabled={urls.length === 0}
                onPress={runImport}
              />
            </Animated.View>
          </>
        )}

        {phase === 'working' && (
          <View style={{ alignItems: 'center', gap: 16, paddingTop: 40 }}>
            <Animated.Text entering={ZoomIn.springify()} style={{ fontSize: 52 }}>
              🛟
            </Animated.Text>
            <AppText v="title" style={{ textAlign: 'center' }}>
              Rescuing your saves...
            </AppText>
            <AppText v="caption" style={{ textAlign: 'center' }}>
              Reading {total} link{total === 1 ? '' : 's'}, figuring out what you’re supposed to do
              with each one.
            </AppText>
            <ProgressBar progress={total === 0 ? 0 : (done + failed) / total} />
            <AppText v="caption">
              {done + failed}/{total} processed
              {failed > 0 ? ` · ${failed} being difficult` : ''}
            </AppText>
          </View>
        )}

        {phase === 'done' && (
          <View style={{ alignItems: 'center', gap: 14, paddingTop: 40 }}>
            <Animated.Text entering={ZoomIn.springify().damping(9)} style={{ fontSize: 56 }}>
              {failed === 0 ? '🎉' : '🫡'}
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <AppText v="title" style={{ textAlign: 'center' }}>
                {done > 0
                  ? `${done} save${done === 1 ? '' : 's'} rescued.`
                  : 'Well, we tried.'}
              </AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(140).springify()}>
              <AppText v="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                {failed === 0
                  ? 'Every link read, summarized, and turned into to-dos. The graveyard is officially a queue.'
                  : `${failed} link${failed === 1 ? '' : 's'} couldn’t be read — they’re on your dashboard with a retry button. The rest are ready to swipe.`}
              </AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={{ alignSelf: 'stretch', gap: 10 }}>
              <Button label="Take me to the deck" onPress={() => router.replace('/deck')} />
              <Button label="Back home" kind="ghost" onPress={finish} />
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${Math.round(Math.min(progress, 1) * 100)}%`, {
      damping: 18,
      stiffness: 160,
    }),
  }));
  return (
    <View
      style={{
        alignSelf: 'stretch',
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ height: 10, borderRadius: 5, backgroundColor: colors.primary }, barStyle]} />
    </View>
  );
}
