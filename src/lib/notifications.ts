import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pickReminderCopy } from '@/lib/copy';
import type { ReminderSettings } from '@/store/types';

const isWeb = Platform.OS === 'web';

export function configureNotificationHandling() {
  if (isWeb) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Backlog reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#6C47FF',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/**
 * Cancel everything and, if the user has pending saves and reminders on,
 * schedule the daily nudge at their chosen time. Called on every app
 * open and whenever the pending count / settings change, per spec.
 */
export async function rescheduleDailyReminder(
  pendingCount: number,
  settings: ReminderSettings
): Promise<void> {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.remindersEnabled || pendingCount === 0) return;
  if (!(await hasNotificationPermission())) return;
  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Swipefile',
      body: pickReminderCopy(pendingCount),
      data: { screen: 'deck' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.reminderHour,
      minute: settings.reminderMinute,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });
}

/** Fires a one-off notification in ~3 seconds so the user can preview the nudge. */
export async function sendTestNotification(pendingCount: number): Promise<boolean> {
  if (isWeb) return false;
  if (!(await requestNotificationPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Swipefile',
      body: pickReminderCopy(Math.max(pendingCount, 1)),
      data: { screen: 'deck' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });
  return true;
}
