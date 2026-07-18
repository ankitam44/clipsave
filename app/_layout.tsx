import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useStore, selectQueue } from '@/store/useStore';
import { useToast, showToast } from '@/store/useToast';
import { ToastHost } from '@/components/ToastHost';
import { LoadingState } from '@/components/States';
import { extractSharedUrl } from '@/lib/share';
import { configureNotificationHandling, rescheduleDailyReminder } from '@/lib/notifications';
import { ProcessLinkError } from '@/api/processLink';
import { toasts, errors } from '@/lib/copy';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandling();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useStore((s) => s.hydrated);
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const settings = useStore((s) => s.settings);
  const pendingCount = useStore((s) => selectQueue(s).length);
  const addItemFromUrl = useStore((s) => s.addItemFromUrl);
  const handledUrls = useRef(new Set<string>());
  const incomingUrl = ExpoLinking.useURL();

  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // ---- Share sheet / deep link intake ----
  const handleIncoming = useCallback(
    async (raw: string | null) => {
      const url = extractSharedUrl(raw);
      if (!url || handledUrls.current.has(url)) return;
      handledUrls.current.add(url);

      showToast(toasts.saved, 'info');
      router.navigate('/');
      try {
        await addItemFromUrl(url);
        showToast('Save is ready. Deck awaits.', 'success');
      } catch (e) {
        const err = e as ProcessLinkError;
        if (err.unsupported) showToast(errors.unsupported, 'info');
        else if (err.status === 0 && err.message.includes('EXPO_PUBLIC_BACKEND_URL')) {
          showToast(errors.noBackend, 'danger');
        } else showToast(errors.processFailed, 'danger');
      }
    },
    [addItemFromUrl, router]
  );

  useEffect(() => {
    if (!ready || !hasOnboarded) return;
    Linking.getInitialURL().then(handleIncoming);
  }, [ready, hasOnboarded, handleIncoming]);

  useEffect(() => {
    if (!ready || !hasOnboarded || !incomingUrl) return;
    handleIncoming(incomingUrl);
  }, [ready, hasOnboarded, incomingUrl, handleIncoming]);

  // ---- Notifications: reschedule on every open + whenever the queue or settings change ----
  useEffect(() => {
    if (!ready || !hasOnboarded) return;
    rescheduleDailyReminder(pendingCount, settings).catch(() => {});
  }, [ready, hasOnboarded, pendingCount, settings]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.screen === 'deck') {
        router.navigate('/deck');
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {!ready ? (
          <LoadingState label="Reading your saves..." />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="deck" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="import" />
            <Stack.Screen name="item/[id]" />
            <Stack.Screen name="category/[name]" />
            <Stack.Screen name="settings" />
          </Stack>
        )}
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
