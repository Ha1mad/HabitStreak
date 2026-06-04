import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { formatReminderTime, getHabitStatus, getOverallStats, Habit } from './habits';
import { PremiumProfile } from './premium';

type QuickWidgetProps = {
  hasHabits: boolean;
  habitName: string;
  streak: number;
  totalHabits: number;
  statusLine: string;
  reminderLine: string;
  accentColor: string;
  inlineSummary: string;
};

type PlusWidgetProps = {
  isPremium: boolean;
  hasHabits: boolean;
  title: string;
  statusLine: string;
  completionRate: number;
  totalCheckIns: number;
  weeklyConsistency: number;
  topHabits: { id: string; name: string; streak: number; color: string }[];
};

type WidgetModule = {
  HabitQuickWidget: { updateSnapshot: (props: QuickWidgetProps) => void };
  HabitPlusWidget: { updateSnapshot: (props: PlusWidgetProps) => void };
};

let cachedWidgetModule: WidgetModule | null | undefined;
let cachedWidgetModulePromise: Promise<WidgetModule | null> | null = null;

async function getWidgetModule() {
  if (cachedWidgetModule !== undefined) {
    return cachedWidgetModule;
  }

  if (cachedWidgetModulePromise) {
    return cachedWidgetModulePromise;
  }

  cachedWidgetModulePromise = import('../../widgets/habit-widgets')
    .then(module => {
      cachedWidgetModule = module as WidgetModule;
      return cachedWidgetModule;
    })
    .catch(error => {
      console.log('Widgets are unavailable in this build yet.', error);
      cachedWidgetModule = null;
      return null;
    });

  return cachedWidgetModulePromise;
}

function buildQuickWidgetProps(habits: Habit[]): QuickWidgetProps {
  const leadHabit = habits[0];

  if (!leadHabit) {
    return {
      hasHabits: false,
      habitName: '',
      streak: 0,
      totalHabits: 0,
      statusLine: '',
      reminderLine: '',
      accentColor: '#4C7EF3',
      inlineSummary: 'HabitStreak • Add your first habit',
    };
  }

  const status = getHabitStatus(leadHabit);
  const statusLine = status.isDoneToday
    ? 'Completed today'
    : status.recoverable
      ? 'Use streak protection'
      : status.streakBroken
        ? 'Start fresh today'
        : 'Ready for check-in';

  const reminderLine = leadHabit.reminderEnabled
    ? `Reminder ${formatReminderTime(leadHabit.reminderTimes[0] ?? leadHabit.reminderTime)}`
    : 'Reminders off';

  return {
    hasHabits: true,
    habitName: leadHabit.name,
    streak: leadHabit.streak,
    totalHabits: habits.length,
    statusLine,
    reminderLine,
    accentColor: leadHabit.color,
    inlineSummary: `${leadHabit.name}: ${leadHabit.streak} day${leadHabit.streak === 1 ? '' : 's'}`,
  };
}

function buildPlusWidgetProps(habits: Habit[], premiumProfile: PremiumProfile): PlusWidgetProps {
  const leadHabit = habits[0];
  const overall = getOverallStats(habits);
  const topHabits = [...habits]
    .sort((left, right) => right.streak - left.streak || right.totalCheckIns - left.totalCheckIns)
    .slice(0, 3)
    .map(habit => ({
      id: habit.id,
      name: habit.name,
      streak: habit.streak,
      color: habit.color,
    }));

  if (!leadHabit) {
    return {
      isPremium: premiumProfile.isPremium,
      hasHabits: false,
      title: 'No habits yet',
      statusLine: 'Create a habit in the app to populate this widget.',
      completionRate: 0,
      totalCheckIns: 0,
      weeklyConsistency: 0,
      topHabits: [],
    };
  }

  const leadStatus = getHabitStatus(leadHabit);
  const statusLine = leadStatus.isDoneToday
    ? `${leadHabit.name} is done for today`
    : leadStatus.recoverable
      ? `${leadHabit.name} can use protection`
      : leadStatus.streakBroken
        ? `${leadHabit.name} is ready for a reset`
        : `${leadHabit.name} is ready for today`;

  return {
    isPremium: premiumProfile.isPremium,
    hasHabits: true,
    title: leadHabit.name,
    statusLine,
    completionRate: overall.completionRate,
    totalCheckIns: overall.totalCheckIns,
    weeklyConsistency: overall.weeklyConsistency,
    topHabits,
  };
}

export async function syncHabitWidgets(habits: Habit[], premiumProfile: PremiumProfile) {
  if (Platform.OS !== 'ios') {
    return;
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return;
  }

  const widgetModule = await getWidgetModule();
  if (!widgetModule) {
    return;
  }

  widgetModule.HabitQuickWidget.updateSnapshot(buildQuickWidgetProps(habits));
  widgetModule.HabitPlusWidget.updateSnapshot(buildPlusWidgetProps(habits, premiumProfile));
}
