import React, { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { BottomSheet } from '@/components/BottomSheet';
import { LoadingState } from '@/components/States';
import { useStore, selectQueue } from '@/store/useStore';
import { showToast } from '@/store/useToast';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from '@/lib/notifications';
import { toasts } from '@/lib/copy';
import { colors, radius } from '@/theme';

const HOURS = [8, 9, 12, 15, 17, 18, 19, 20, 21];

const FAQ = [
  {
    q: 'How do links get in here?',
    a: 'Share any video or post from YouTube, Instagram, TikTok, or your browser and pick Swipefile in the share sheet. The AI reads it, summarizes it, and turns it into a to-do list before you’ve even watched it.',
  },
  {
    q: 'What’s with the swiping?',
    a: 'Your saves show up as a deck of cards. Swipe right when you’ve watched something and want to keep its to-dos. Swipe left to archive it and move on with your life. Both count — deciding is the productive part.',
  },
  {
    q: 'Why is it nagging me at 6pm?',
    a: 'If you have saves waiting, Swipefile sends one daily reminder at the time you pick. No streak guilt spiral, no triple notifications — just one nudge, because the backlog won’t swipe itself.',
  },
];

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useStore((s) => s.hydrated);
  const settings = useStore((s) => s.settings);
  const setRemindersEnabled = useStore((s) => s.setRemindersEnabled);
  const setReminderTime = useStore((s) => s.setReminderTime);
  const clearArchived = useStore((s) => s.clearArchived);
  const seedDemoData = useStore((s) => s.seedDemoData);
  const archivedCount = useStore((s) => s.items.filter((it) => it.reviewStatus === 'archived').length);
  const pendingCount = useStore((s) => selectQueue(s).length);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    hasNotificationPermission().then(setPermissionGranted);
  }, []);

  if (!hydrated) return <LoadingState label="Loading settings..." />;

  const toggleReminders = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (!granted && Platform.OS !== 'web') {
        showToast('Notifications are blocked in system settings.', 'danger');
        return;
      }
    }
    setRemindersEnabled(value);
    showToast(value ? 'Reminders on. We’ll be gentle. Mostly.' : 'Reminders off. You’re on your own now.', 'info');
  };

  const formatHour = (h: number) =>
    h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, gap: 12 }}>
        <PressableScale haptic onPress={() => router.back()} style={{ padding: 6 }}>
          <AppText style={{ fontSize: 20 }}>←</AppText>
        </PressableScale>
        <AppText v="title">Settings</AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 26 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reminders */}
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
          <AppText v="heading">Reminders</AppText>
          <View style={sectionStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <AppText v="body">Daily nudge</AppText>
                <AppText v="caption">Only fires if something is actually waiting on you.</AppText>
              </View>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={toggleReminders}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>

            {settings.remindersEnabled && (
              <View style={{ gap: 10, marginTop: 14 }}>
                <AppText v="caption">Nag me at</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {HOURS.map((h) => (
                    <PressableScale
                      key={h}
                      haptic
                      onPress={() => {
                        setReminderTime(h, 0);
                        showToast(`Reminder moved to ${formatHour(h)}.`, 'info');
                      }}
                      style={{
                        backgroundColor: settings.reminderHour === h ? colors.primary : colors.bg,
                        borderRadius: radius.pill,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: settings.reminderHour === h ? colors.primary : colors.border,
                      }}
                    >
                      <AppText v="caption" color={settings.reminderHour === h ? '#FFF' : colors.text}>
                        {formatHour(h)}
                      </AppText>
                    </PressableScale>
                  ))}
                </View>
                <Button
                  label="Preview the nudge"
                  kind="ghost"
                  onPress={async () => {
                    const ok = await sendTestNotification(pendingCount);
                    showToast(
                      ok
                        ? 'Test notification landing in 3 seconds. Look busy.'
                        : Platform.OS === 'web'
                          ? 'Notifications need the iOS/Android app.'
                          : 'Notifications are blocked in system settings.',
                      ok ? 'success' : 'danger'
                    );
                  }}
                />
                {permissionGranted === false && Platform.OS !== 'web' && (
                  <PressableScale haptic onPress={() => Linking.openSettings()}>
                    <AppText v="caption" color={colors.danger}>
                      Notifications are blocked — tap to open system settings.
                    </AppText>
                  </PressableScale>
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Data */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={{ gap: 12 }}>
          <AppText v="heading">Housekeeping</AppText>
          <View style={sectionStyle}>
            <PressableScale
              haptic
              onPress={() => (archivedCount > 0 ? setConfirmClear(true) : showToast('Nothing archived to clear. Spotless.', 'info'))}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View>
                <AppText v="body">Clear all archived items</AppText>
                <AppText v="caption">
                  {archivedCount === 0
                    ? 'The archive is empty.'
                    : `${archivedCount} archived save${archivedCount === 1 ? '' : 's'} ready for the void.`}
                </AppText>
              </View>
              <AppText style={{ fontSize: 18 }}>🧹</AppText>
            </PressableScale>
          </View>
          {__DEV__ && (
            <View style={sectionStyle}>
              <PressableScale
                haptic
                onPress={() => {
                  seedDemoData();
                  showToast('3 demo saves added. For science.', 'success');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <View>
                  <AppText v="body">Seed demo data (dev only)</AppText>
                  <AppText v="caption">Adds one pending, one watched, one archived save.</AppText>
                </View>
                <AppText style={{ fontSize: 18 }}>🧪</AppText>
              </PressableScale>
            </View>
          )}
        </Animated.View>

        {/* How it works */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12 }}>
          <AppText v="heading">How it works</AppText>
          <View style={[sectionStyle, { gap: 0 }]}>
            {FAQ.map((item, i) => (
              <View key={i} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <PressableScale
                  haptic
                  scaleTo={0.99}
                  onPress={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
                >
                  <AppText v="body" style={{ flex: 1, paddingRight: 10 }}>
                    {item.q}
                  </AppText>
                  <AppText v="body" color={colors.primary}>
                    {openFaq === i ? '−' : '+'}
                  </AppText>
                </PressableScale>
                {openFaq === i && (
                  <Animated.View entering={FadeInDown.springify()} style={{ paddingBottom: 14 }}>
                    <AppText v="caption" style={{ lineHeight: 19 }}>
                      {item.a}
                    </AppText>
                  </Animated.View>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={{ gap: 12 }}>
          <AppText v="heading">About</AppText>
          <View style={[sectionStyle, { gap: 6 }]}>
            <AppText v="body">Swipefile</AppText>
            <AppText v="caption">
              Version {Constants.expoConfig?.version ?? '1.0.0'} · Built for people who save
              tutorials at 1am and feel bad about it at 1pm.
            </AppText>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Clear-archive confirmation */}
      <BottomSheet visible={confirmClear} onClose={() => setConfirmClear(false)}>
        <View style={{ gap: 14 }}>
          <AppText v="title">Empty the archive?</AppText>
          <AppText v="body" color={colors.textSecondary}>
            {archivedCount} archived save{archivedCount === 1 ? '' : 's'} will be gone for good.
            They weren’t doing anything anyway.
          </AppText>
          <Button
            label="Yes, into the void"
            kind="danger"
            onPress={() => {
              clearArchived();
              setConfirmClear(false);
              showToast(toasts.archiveCleared, 'success');
            }}
          />
          <Button label="Keep hoarding" kind="ghost" onPress={() => setConfirmClear(false)} />
        </View>
      </BottomSheet>
    </View>
  );
}

const sectionStyle = {
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: 16,
} as const;
