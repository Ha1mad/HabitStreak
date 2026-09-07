import AsyncStorage from '@react-native-async-storage/async-storage';

export const HABITS_STORAGE_KEY = 'habits';
export const DEFAULT_REMINDER_TIME = '20:00';
export const REMINDER_TIME_OPTIONS = ['07:00', '08:00', '12:00', '18:00', '20:00', '21:00'];
export const NOTIFICATION_STYLE_OPTIONS = ['gentle', 'focus', 'persistent'] as const;
export const PROTECTION_MODE_OPTIONS = ['standard', 'shield'] as const;

export type HabitHistoryEntry = {
  date: string;
  note: string;
  usedRecovery: boolean;
};

export type NotificationStyle = (typeof NOTIFICATION_STYLE_OPTIONS)[number];
export type ProtectionMode = (typeof PROTECTION_MODE_OPTIONS)[number];

export type Habit = {
  id: string;
  name: string;
  streak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastCheckInDate: string | null;
  lastPressTime: number | null;
  color: string;
  history: HabitHistoryEntry[];
  reminderEnabled: boolean;
  reminderTime: string;
  reminderTimes: string[];
  notificationStyle: NotificationStyle;
  recoverySkipsAvailable: number;
  protectionMode: ProtectionMode;
  createdAt: number;
};

type HabitStatus = {
  canCheckInToday: boolean;
  isDoneToday: boolean;
  recoverable: boolean;
  streakBroken: boolean;
  gapDays: number | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function formatReminderTime(value: string) {
  const [rawHours, rawMinutes] = value.split(':').map(Number);

  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) {
    return value;
  }

  const period = rawHours >= 12 ? 'PM' : 'AM';
  const normalizedHours = rawHours % 12 === 0 ? 12 : rawHours % 12;
  return `${normalizedHours}:${pad(rawMinutes)} ${period}`;
}

export function formatReminderTimes(values: string[]) {
  return values.map(formatReminderTime).join(', ');
}

export function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getDateKey(date);
}

function diffInDays(startDateKey: string, endDateKey: string) {
  const start = parseDateKey(startDateKey).getTime();
  const end = parseDateKey(endDateKey).getTime();
  return Math.round((end - start) / ONE_DAY_MS);
}

function uniqueHistory(entries: HabitHistoryEntry[]) {
  const map = new Map<string, HabitHistoryEntry>();
  entries.forEach(entry => {
    map.set(entry.date, entry);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeHistory(rawHistory: unknown) {
  if (!Array.isArray(rawHistory)) {
    return [] as HabitHistoryEntry[];
  }

  return uniqueHistory(
    rawHistory
      .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      .map(entry => ({
        date: typeof entry.date === 'string' ? entry.date : getDateKey(),
        note: typeof entry.note === 'string' ? entry.note : '',
        usedRecovery: Boolean(entry.usedRecovery),
      }))
  );
}

function getCreatedAt(history: HabitHistoryEntry[], createdAt: unknown) {
  if (typeof createdAt === 'number') {
    return createdAt;
  }

  if (history.length > 0) {
    return parseDateKey(history[0].date).getTime();
  }

  return Date.now();
}

export function getHabitStatus(habit: Habit, today = getDateKey()): HabitStatus {
  if (!habit.lastCheckInDate) {
    return {
      canCheckInToday: true,
      isDoneToday: false,
      recoverable: false,
      streakBroken: false,
      gapDays: null,
    };
  }

  const gapDays = diffInDays(habit.lastCheckInDate, today);

  if (gapDays <= 0) {
    return {
      canCheckInToday: false,
      isDoneToday: true,
      recoverable: false,
      streakBroken: false,
      gapDays,
    };
  }

  if (gapDays === 1) {
    return {
      canCheckInToday: true,
      isDoneToday: false,
      recoverable: false,
      streakBroken: false,
      gapDays,
    };
  }

  const recoveryWindow = habit.protectionMode === 'shield' ? 3 : 2;

  if (gapDays === recoveryWindow && habit.recoverySkipsAvailable > 0) {
    return {
      canCheckInToday: false,
      isDoneToday: false,
      recoverable: true,
      streakBroken: false,
      gapDays,
    };
  }

  return {
    canCheckInToday: true,
    isDoneToday: false,
    recoverable: false,
    streakBroken: true,
    gapDays,
  };
}

export function normalizeHabit(rawHabit: unknown): Habit {
  const raw = (typeof rawHabit === 'object' && rawHabit !== null ? rawHabit : {}) as Record<string, unknown>;
  const history = normalizeHistory(raw.history);
  const derivedLastCheckInDate =
    typeof raw.lastCheckInDate === 'string'
      ? raw.lastCheckInDate
      : typeof raw.lastPressTime === 'number'
        ? getDateKey(new Date(raw.lastPressTime))
        : history.length > 0
          ? history[history.length - 1].date
          : null;

  const totalCheckIns =
    typeof raw.totalCheckIns === 'number'
      ? raw.totalCheckIns
      : history.filter(entry => !entry.usedRecovery).length;

  const normalized: Habit = {
    id: typeof raw.id === 'string' ? raw.id : Date.now().toString(),
    name: typeof raw.name === 'string' ? raw.name : 'New Habit',
    streak: typeof raw.streak === 'number' ? raw.streak : 0,
    longestStreak: typeof raw.longestStreak === 'number' ? raw.longestStreak : typeof raw.streak === 'number' ? raw.streak : 0,
    totalCheckIns,
    lastCheckInDate: derivedLastCheckInDate,
    lastPressTime: typeof raw.lastPressTime === 'number' ? raw.lastPressTime : null,
    color: typeof raw.color === 'string' ? raw.color : '#007AFF',
    history,
    reminderEnabled: typeof raw.reminderEnabled === 'boolean' ? raw.reminderEnabled : false,
    reminderTime: typeof raw.reminderTime === 'string' ? raw.reminderTime : DEFAULT_REMINDER_TIME,
    reminderTimes:
      Array.isArray(raw.reminderTimes) && raw.reminderTimes.every(item => typeof item === 'string')
        ? Array.from(new Set(raw.reminderTimes)).sort()
        : [typeof raw.reminderTime === 'string' ? raw.reminderTime : DEFAULT_REMINDER_TIME],
    notificationStyle:
      typeof raw.notificationStyle === 'string' && NOTIFICATION_STYLE_OPTIONS.includes(raw.notificationStyle as NotificationStyle)
        ? (raw.notificationStyle as NotificationStyle)
        : 'gentle',
    recoverySkipsAvailable: typeof raw.recoverySkipsAvailable === 'number' ? raw.recoverySkipsAvailable : 1,
    protectionMode:
      typeof raw.protectionMode === 'string' && PROTECTION_MODE_OPTIONS.includes(raw.protectionMode as ProtectionMode)
        ? (raw.protectionMode as ProtectionMode)
        : 'standard',
    createdAt: getCreatedAt(history, raw.createdAt),
  };

  return applyDecay(normalized);
}

export function normalizeHabits(rawHabits: unknown) {
  if (!Array.isArray(rawHabits)) {
    return [] as Habit[];
  }

  return rawHabits.map(normalizeHabit);
}

export function applyDecay(habit: Habit, today = getDateKey()) {
  const status = getHabitStatus(habit, today);

  if (status.streakBroken) {
    return {
      ...habit,
      streak: 0,
      lastCheckInDate: null,
      lastPressTime: null,
    };
  }

  return habit;
}

export async function loadHabits() {
  const saved = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
  return normalizeHabits(saved ? JSON.parse(saved) : []);
}

export async function saveHabits(habits: Habit[]) {
  await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
}

export function createHabit(name: string, color: string) {
  return normalizeHabit({
    id: Date.now().toString(),
    name: name.trim(),
    streak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    lastCheckInDate: null,
    lastPressTime: null,
    color,
    history: [],
    reminderEnabled: false,
    reminderTime: DEFAULT_REMINDER_TIME,
    reminderTimes: [DEFAULT_REMINDER_TIME],
    notificationStyle: 'gentle',
    recoverySkipsAvailable: 1,
    protectionMode: 'standard',
    createdAt: Date.now(),
  });
}

export function updateHabit(habit: Habit, updates: Partial<Habit>) {
  return normalizeHabit({
    ...habit,
    ...updates,
    reminderTimes:
      updates.reminderTimes ??
      (updates.reminderTime ? [updates.reminderTime] : habit.reminderTimes),
  });
}

export function completeHabitCheckIn(habit: Habit, note: string, today = getDateKey()) {
  const status = getHabitStatus(habit, today);
  if (!status.canCheckInToday) {
    return habit;
  }

  const nextStreak = habit.streak + 1;
  const earnedRecovery = nextStreak > 0 && nextStreak % 7 === 0 ? (habit.protectionMode === 'shield' ? 2 : 1) : 0;
  const nextHistory = uniqueHistory([
    ...habit.history.filter(entry => entry.date !== today),
    {
      date: today,
      note: note.trim(),
      usedRecovery: false,
    },
  ]);

  return normalizeHabit({
    ...habit,
    streak: nextStreak,
    longestStreak: Math.max(habit.longestStreak, nextStreak),
    totalCheckIns: habit.totalCheckIns + 1,
    lastCheckInDate: today,
    lastPressTime: Date.now(),
    history: nextHistory,
    recoverySkipsAvailable: Math.min(habit.protectionMode === 'shield' ? 5 : 3, habit.recoverySkipsAvailable + earnedRecovery),
  });
}

export function applyRecoveryPass(habit: Habit, today = getDateKey()) {
  const status = getHabitStatus(habit, today);
  if (!status.recoverable || !habit.lastCheckInDate) {
    return habit;
  }

  const recoveredDate = addDays(today, habit.protectionMode === 'shield' ? -2 : -1);
  const nextHistory = uniqueHistory([
    ...habit.history.filter(entry => entry.date !== recoveredDate),
    {
      date: recoveredDate,
      note: 'Recovery pass used',
      usedRecovery: true,
    },
  ]);

  return normalizeHabit({
    ...habit,
    history: nextHistory,
    lastCheckInDate: recoveredDate,
    recoverySkipsAvailable: Math.max(0, habit.recoverySkipsAvailable - 1),
  });
}

export function getWeeklyHistory(habit: Habit, days = 7, today = getDateKey()) {
  const historyMap = new Map(habit.history.map(entry => [entry.date, entry]));
  const items = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = addDays(today, -index);
    const entry = historyMap.get(date);
    items.push({
      date,
      label: parseDateKey(date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
      state: entry ? (entry.usedRecovery ? 'recovered' : 'done') : date === today ? 'today' : 'missed',
      note: entry?.note ?? '',
    });
  }

  return items;
}

export function getCalendarHistory(habit: Habit, days = 35, today = getDateKey()) {
  const historyMap = new Map(habit.history.map(entry => [entry.date, entry]));
  const items = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = addDays(today, -index);
    const entry = historyMap.get(date);
    const parsed = parseDateKey(date);
    items.push({
      date,
      dayNumber: Number(date.slice(-2)),
      displayLabel: `${parsed.getMonth() + 1}/${parsed.getDate()}`,
      state: entry ? (entry.usedRecovery ? 'recovered' : 'done') : 'empty',
      note: entry?.note ?? '',
    });
  }

  return items;
}

export function getHabitStats(habit: Habit) {
  const daysTracked = Math.max(1, diffInDays(getDateKey(new Date(habit.createdAt)), getDateKey()) + 1);
  const weeklyCompleted = getWeeklyHistory(habit).filter(day => day.state === 'done' || day.state === 'recovered').length;
  const noteCount = habit.history.filter(entry => entry.note.trim() && !entry.usedRecovery).length;
  const noteUsageRate = habit.totalCheckIns === 0 ? 0 : Math.round((noteCount / habit.totalCheckIns) * 100);
  const monthlyCompleted = getCalendarHistory(habit, 30).filter(day => day.state === 'done' || day.state === 'recovered').length;

  return {
    totalCheckIns: habit.totalCheckIns,
    longestStreak: habit.longestStreak,
    completionRate: Math.round((habit.totalCheckIns / daysTracked) * 100),
    weeklyConsistency: Math.round((weeklyCompleted / 7) * 100),
    weeklyCompleted,
    noteCount,
    noteUsageRate,
    monthlyCompleted,
    reminderCount: habit.reminderTimes.length,
  };
}

export function getOverallStats(habits: Habit[]) {
  const totals = habits.map(getHabitStats);
  const trackedDays =
    habits.length === 0
      ? 1
      : habits.reduce((total, habit) => {
          const days = Math.max(1, diffInDays(getDateKey(new Date(habit.createdAt)), getDateKey()) + 1);
          return total + days;
        }, 0);

  return {
    activeHabits: habits.length,
    totalCheckIns: habits.reduce((sum, habit) => sum + habit.totalCheckIns, 0),
    longestStreak: habits.reduce((max, habit) => Math.max(max, habit.longestStreak), 0),
    completionRate:
      habits.length === 0
        ? 0
        : Math.round((habits.reduce((sum, habit) => sum + habit.totalCheckIns, 0) / trackedDays) * 100),
    weeklyConsistency:
      totals.length === 0 ? 0 : Math.round(totals.reduce((sum, stat) => sum + stat.weeklyConsistency, 0) / totals.length),
    notesCount: totals.reduce((sum, stat) => sum + stat.noteCount, 0),
    remindersEnabled: habits.filter(habit => habit.reminderEnabled).length,
    recoverySkipsAvailable: habits.reduce((sum, habit) => sum + habit.recoverySkipsAvailable, 0),
  };
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function getHabitStatusText(habit: Habit, translate: Translate = key => key, today = getDateKey()) {
  const status = getHabitStatus(habit, today);

  if (status.isDoneToday) {
    return translate('Completed today');
  }

  if (status.recoverable) {
    return translate('Use a skip pass to save your streak');
  }

  if (status.streakBroken) {
    return translate('Streak reset. Start fresh today');
  }

  if (!habit.lastCheckInDate) {
    return translate('Start your streak today');
  }

  return translate('Ready for today’s check-in');
}

export function getRecentNotes(habit: Habit, count = 3) {
  return [...habit.history]
    .filter(entry => entry.note.trim() && !entry.usedRecovery)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
}

export function getCoachSummary(habit: Habit, translate: Translate = key => key) {
  const stats = getHabitStats(habit);
  const status = getHabitStatus(habit);
  const recentNotes = getRecentNotes(habit, 2).map(entry => entry.note);

  const headlineKey =
    status.recoverable
      ? 'Protect your momentum'
      : stats.weeklyConsistency >= 80
        ? 'You are in a strong rhythm'
        : stats.weeklyConsistency >= 50
          ? 'You are building consistency'
          : 'A smaller daily target could help';

  const weeklyReviewKey =
    stats.weeklyConsistency >= 80
      ? 'You completed {{completed}} of the last 7 days. Keep the routine simple and repeatable.'
      : 'You completed {{completed}} of the last 7 days. Aim for one easy win tomorrow.';

  const noteSummaryKey =
    recentNotes.length > 0
      ? 'Recent notes mention: {{notes}}'
      : 'Add quick notes after check-ins to unlock better weekly reviews.';

  const suggestionKey =
    habit.reminderEnabled && habit.reminderTimes.length > 1
      ? 'Your reminder stack is set for {{times}}. Keep only the times you actually respond to.'
      : habit.reminderEnabled
        ? 'Your reminder is set for {{time}}. Match it to the moment you already have spare attention.'
        : 'Turn on reminders if you want a more stable daily cue.';

  return {
    headline: translate(headlineKey),
    weeklyReview: translate(weeklyReviewKey, { completed: stats.weeklyCompleted }),
    noteSummary:
      recentNotes.length > 0
        ? translate(noteSummaryKey, { notes: recentNotes.join(' | ') })
        : translate(noteSummaryKey),
    suggestion:
      habit.reminderEnabled && habit.reminderTimes.length > 1
        ? translate(suggestionKey, { times: habit.reminderTimes.join(', ') })
        : habit.reminderEnabled
          ? translate(suggestionKey, { time: habit.reminderTimes[0] })
          : translate(suggestionKey),
  };
}

export function moveHabit(habits: Habit[], fromIndex: number, direction: 'left' | 'right') {
  const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;

  if (fromIndex < 0 || toIndex < 0 || fromIndex >= habits.length || toIndex >= habits.length) {
    return habits;
  }

  const nextHabits = [...habits];
  const [item] = nextHabits.splice(fromIndex, 1);
  nextHabits.splice(toIndex, 0, item);
  return nextHabits;
}
