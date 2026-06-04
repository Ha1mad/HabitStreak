import AsyncStorage from '@react-native-async-storage/async-storage';

export const FREE_HABIT_LIMIT = 2;
export const PREMIUM_PROFILE_KEY = 'premiumProfile';

export type PremiumTheme = 'classic' | 'sunrise' | 'forest' | 'midnight';
export type AppIconStyle = 'classic' | 'spark' | 'bold';

export type PremiumProfile = {
  isPremium: boolean;
  softPaywallSeen: boolean;
  themePack: PremiumTheme;
  appIconStyle: AppIconStyle;
};

export const defaultPremiumProfile: PremiumProfile = {
  isPremium: false,
  softPaywallSeen: false,
  themePack: 'classic',
  appIconStyle: 'classic',
};

export const premiumFeatureGroups = {
  free: [
    'Up to 2 habits',
    'Basic streak tracking',
    'Simple notes',
    'Weekly history',
    'Basic stats',
  ],
  premium: [
    'Unlimited habits',
    'Smart reminders with multiple reminder times',
    'Advanced stats and insights',
    'Full calendar history',
    'Cloud backup and sync',
    'Widgets and lock screen widgets',
    'Custom themes and icon styles',
    'Deeper streak protection',
    'Coach reviews and habit summaries',
  ],
};

export const premiumThemePacks = {
  classic: {
    accent: '#007AFF',
    card: '#0F172A',
    label: 'Classic Blue',
    light: { background: '#F5F7FB', surface: '#FFFFFF', border: '#D9E4F5', tint: '#007AFF' },
    dark: { background: '#161618', surface: '#1C1C1E', border: '#38383A', tint: '#0A84FF' },
  },
  sunrise: {
    accent: '#F97316',
    card: '#7C2D12',
    label: 'Sunrise Ember',
    light: { background: '#FFF4EC', surface: '#FFFFFF', border: '#F5D2BF', tint: '#F97316' },
    dark: { background: '#231711', surface: '#31211A', border: '#5B3728', tint: '#FB923C' },
  },
  forest: {
    accent: '#16A34A',
    card: '#14532D',
    label: 'Forest Focus',
    light: { background: '#F0FBF4', surface: '#FFFFFF', border: '#CBE8D3', tint: '#16A34A' },
    dark: { background: '#101B14', surface: '#17251B', border: '#2F4A37', tint: '#22C55E' },
  },
  midnight: {
    accent: '#8B5CF6',
    card: '#312E81',
    label: 'Midnight Pulse',
    light: { background: '#F6F2FF', surface: '#FFFFFF', border: '#DDD2FA', tint: '#8B5CF6' },
    dark: { background: '#15122A', surface: '#1E1A3A', border: '#3C3668', tint: '#A78BFA' },
  },
  ocean: {
    accent: '#0891B2',
    card: '#164E63',
    label: 'Ocean Calm',
    light: { background: '#ECFBFF', surface: '#FFFFFF', border: '#CAEAF1', tint: '#0891B2' },
    dark: { background: '#0D1C22', surface: '#142A33', border: '#29505E', tint: '#22D3EE' },
  },
  rose: {
    accent: '#E11D48',
    card: '#881337',
    label: 'Rose Energy',
    light: { background: '#FFF1F5', surface: '#FFFFFF', border: '#F7CAD6', tint: '#E11D48' },
    dark: { background: '#241118', surface: '#311720', border: '#653146', tint: '#FB7185' },
  },
  sand: {
    accent: '#C2410C',
    card: '#7C2D12',
    label: 'Desert Sand',
    light: { background: '#FDF6EE', surface: '#FFFFFF', border: '#EFD7BF', tint: '#C2410C' },
    dark: { background: '#231914', surface: '#30211A', border: '#5F4335', tint: '#FB923C' },
  },
} as const;

export const premiumIconStyles = {
  classic: { emoji: '🔥', label: 'Classic Flame' },
  spark: { emoji: '✨', label: 'Spark' },
  bold: { emoji: '⚡', label: 'Bold Streak' },
} as const;

export async function loadPremiumProfile() {
  const raw = await AsyncStorage.getItem(PREMIUM_PROFILE_KEY);
  if (!raw) {
    return defaultPremiumProfile;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PremiumProfile>;
    return {
      isPremium: Boolean(parsed.isPremium),
      softPaywallSeen: Boolean(parsed.softPaywallSeen),
      themePack: parsed.themePack ?? defaultPremiumProfile.themePack,
      appIconStyle: parsed.appIconStyle ?? defaultPremiumProfile.appIconStyle,
    };
  } catch {
    return defaultPremiumProfile;
  }
}

export async function savePremiumProfile(profile: PremiumProfile) {
  await AsyncStorage.setItem(PREMIUM_PROFILE_KEY, JSON.stringify(profile));
}

export function canCreateAnotherHabit(isPremium: boolean, currentHabitCount: number) {
  return isPremium || currentHabitCount < FREE_HABIT_LIMIT;
}

export function getPremiumMessage() {
  return 'Stay consistent with unlimited habits, smarter reminders, deeper insights, and backup.';
}
