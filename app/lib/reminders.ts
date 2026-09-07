import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Habit } from './habits';

export const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';

export async function getReminderDebugInfo() {
  return [] as ReminderDebugEntry[];
}

export async function getScheduledNotificationsCount() {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

export async function sendImmediateTestNotification() {
  const permissionGranted = await requestReminderPermissions();
  if (!permissionGranted) {
    return { ok: false };
  }
  await Notifications.scheduleNotificationAsync({ content: { title: 'HabitStreak', body: 'Test notification' }, trigger: null });
  return { ok: true };
}

export async function scheduleTestReminderNotification() {
  const permissionGranted = await requestReminderPermissions();
  if (!permissionGranted) {
    return { ok: false };
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: 'HabitStreak', body: 'Test reminder' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, repeats: false },
  });
  return { ok: true };
}

const REMINDER_CHANNEL_ID = 'habit-reminders';
const SCHEDULED_REMINDER_IDS_KEY = 'scheduledReminderIdsByHabit';
type ReminderMap = Record<string, string[]>;
type ReminderDebugEntry = {
  habitName: string;
  reminderTime: string;
  expectedNextAt: string;
  dailyTriggerAt: string | null;
  bootstrapTriggerAt: string | null;
};

let notificationsConfigured = false;

function buildReminderContent(habit: Habit, reminderTime: string): Notifications.NotificationContentInput {
  const formattedTime = formatDisplayTime(reminderTime);

  if (habit.notificationStyle === 'focus') {
    return {
      title: `Time for ${habit.name}`,
      body: `Your ${formattedTime} reminder is here. Open HabitStreak and protect your streak.`,
      sound: true,
      data: { habitId: habit.id, reminderTime },
    };
  }

  if (habit.notificationStyle === 'persistent') {
    return {
      title: `${habit.name} needs your check-in`,
      body: `Your streak is waiting. Check in from HabitStreak when you're ready.`,
      sound: true,
      data: { habitId: habit.id, reminderTime },
    };
  }

  return {
    title: `${habit.name} reminder`,
    body: `A small step now keeps your streak moving. Scheduled for ${formattedTime}.`,
    sound: true,
    data: { habitId: habit.id, reminderTime },
  };
}

function formatDisplayTime(value: string) {
  const [rawHours, rawMinutes] = value.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) {
    return value;
  }

  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hours = rawHours % 12 === 0 ? 12 : rawHours % 12;
  return `${hours}:${rawMinutes.toString().padStart(2, '0')} ${period}`;
}

function parseReminderTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return { hours, minutes };
}

async function loadScheduledReminderMap() {
  const raw = await AsyncStorage.getItem(SCHEDULED_REMINDER_IDS_KEY);
  if (!raw) {
    return {} as ReminderMap;
  }

  try {
    return JSON.parse(raw) as ReminderMap;
  } catch {
    return {} as ReminderMap;
  }
}

async function saveScheduledReminderMap(map: ReminderMap) {
  await AsyncStorage.setItem(SCHEDULED_REMINDER_IDS_KEY, JSON.stringify(map));
}

function buildDailyTrigger(hours: number, minutes: number) {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: hours,
    minute: minutes,
    ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
  } as const;
}

function getExpectedNextReminderDate(hours: number, minutes: number, now = new Date()) {
  const nextDate = new Date(now);
  nextDate.setHours(hours, minutes, 0, 0);

  if (nextDate.getTime() <= now.getTime()) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return nextDate;
}

function shouldScheduleBootstrapReminder(expectedNextDate: Date, projectedDailyDate: Date | null, now = new Date()) {
  const isLaterToday =
    expectedNextDate.getFullYear() === now.getFullYear() &&
    expectedNextDate.getMonth() === now.getMonth() &&
    expectedNextDate.getDate() === now.getDate();

  if (!isLaterToday) {
    return false;
  }

  if (!projectedDailyDate) {
    return true;
  }

  return Math.abs(projectedDailyDate.getTime() - expectedNextDate.getTime()) > 30_000;
}

export async function configureReminderNotifications() {
  if (notificationsConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 180, 120, 180],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  notificationsConfigured = true;
}

export async function hasNotificationPermission() {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestReminderPermissions() {
  await configureReminderNotifications();

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted || currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const nextPermissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return nextPermissions.granted || nextPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function cancelAllHabitReminders() {
  const reminderMap = await loadScheduledReminderMap();
  const identifiers = Object.values(reminderMap).flat();

  await Promise.all(identifiers.map(identifier => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => null)));
  await saveScheduledReminderMap({});
}

export async function syncHabitReminders(habits: Habit[]) {
  await configureReminderNotifications();

  const notificationsEnabled = (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) !== 'false';
  if (!notificationsEnabled) {
    await cancelAllHabitReminders();
    return;
  }

  const permissionGranted = await hasNotificationPermission();
  if (!permissionGranted) {
    return;
  }

  const previousMap = await loadScheduledReminderMap();
  const previousIdentifiers = Object.values(previousMap).flat();
  await Promise.all(previousIdentifiers.map(identifier => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => null)));

  const nextMap: ReminderMap = {};
  const now = new Date();

  for (const habit of habits) {
    if (!habit.reminderEnabled) {
      continue;
    }

    const reminderIds: string[] = [];
    for (const time of habit.reminderTimes) {
      const parsed = parseReminderTime(time);
      if (!parsed) {
        continue;
      }

      const expectedNextDate = getExpectedNextReminderDate(parsed.hours, parsed.minutes, now);
      const dailyTrigger = buildDailyTrigger(parsed.hours, parsed.minutes);
      const projectedDailyTimestamp = await Notifications.getNextTriggerDateAsync(dailyTrigger);
      const projectedDailyDate = projectedDailyTimestamp ? new Date(projectedDailyTimestamp) : null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: buildReminderContent(habit, time),
        trigger: dailyTrigger,
      });

      reminderIds.push(identifier);

      let bootstrapIdentifier: string | null = null;
      if (shouldScheduleBootstrapReminder(expectedNextDate, projectedDailyDate, now)) {
        bootstrapIdentifier = await Notifications.scheduleNotificationAsync({
          content: buildReminderContent(habit, time),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: expectedNextDate,
            ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
          },
        });
        reminderIds.push(bootstrapIdentifier);
      }

    }

    if (reminderIds.length > 0) {
      nextMap[habit.id] = reminderIds;
    }
  }

  await saveScheduledReminderMap(nextMap);
}
