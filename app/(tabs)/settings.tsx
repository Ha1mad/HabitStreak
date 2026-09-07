import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router/react-navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { DEFAULT_REMINDER_TIME, Habit, formatReminderTime, formatReminderTimes, getCoachSummary, getOverallStats, loadHabits, saveHabits } from '../lib/habits';
import {
  FREE_HABIT_LIMIT,
  PremiumProfile,
  defaultPremiumProfile,
  loadPremiumProfile,
  premiumIconStyles,
  premiumThemePacks,
  savePremiumProfile,
} from '../lib/premium';
import {
  NOTIFICATIONS_ENABLED_KEY,
  cancelAllHabitReminders,
  requestReminderPermissions,
  syncHabitReminders,
} from '../lib/reminders';
import { getSubscriptionSupportText, subscriptionOffers } from '../lib/subscriptions';

const REMINDER_OPTIONS = ['07:00', '08:00', '12:00', '18:00', '20:00', '21:00'];

function normalizeReminderInput(value: string) {
  const trimmed = value.trim().replace(/\./g, '');
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);

  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const suffix = twelveHourMatch[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }

    if (suffix === 'PM' && hours !== 12) {
      hours += 12;
    }

    if (suffix === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const { theme, toggleTheme, colors, activeThemePack, refreshThemePreferences } = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultReminderTime, setDefaultReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [customReminderTime, setCustomReminderTime] = useState('');
  const [premiumProfile, setPremiumProfile] = useState<PremiumProfile>(defaultPremiumProfile);
  const [showThemes, setShowThemes] = useState(false);

  const loadData = useCallback(async () => {
    const [savedHabits, notificationsValue, reminderValue, savedProfile] = await Promise.all([
      loadHabits(),
      AsyncStorage.getItem('notificationsEnabled'),
      AsyncStorage.getItem('defaultReminderTime'),
      loadPremiumProfile(),
    ]);

    setHabits(savedHabits);
    setNotificationsEnabled(notificationsValue !== 'false');
    setDefaultReminderTime(reminderValue || DEFAULT_REMINDER_TIME);
    setPremiumProfile(savedProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().catch(error => console.log('Error loading settings', error));
    }, [loadData])
  );

  const overallStats = useMemo(() => getOverallStats(habits), [habits]);
  const topCoach = useMemo(() => (habits.length > 0 ? getCoachSummary(habits[0]) : null), [habits]);
  const accentColor = premiumThemePacks[premiumProfile.themePack].accent;

  const cycleReminderTime = useCallback(async () => {
    const currentIndex = REMINDER_OPTIONS.indexOf(defaultReminderTime);
    const nextValue = REMINDER_OPTIONS[(currentIndex + 1) % REMINDER_OPTIONS.length];
    setDefaultReminderTime(nextValue);
    await AsyncStorage.setItem('defaultReminderTime', nextValue);
  }, [defaultReminderTime]);

  const addCustomReminderTime = useCallback(async () => {
    if (!premiumProfile.isPremium) {
      Alert.alert('Premium reminders', 'Custom reminder times are part of Premium.');
      return;
    }

    const normalizedTime = normalizeReminderInput(customReminderTime);

    if (!normalizedTime) {
      Alert.alert('Invalid time', 'Use a time like 6:45 AM, 9:15 PM, or 21:15.');
      return;
    }

    setDefaultReminderTime(normalizedTime);
    setCustomReminderTime('');
    await AsyncStorage.setItem('defaultReminderTime', normalizedTime);
  }, [customReminderTime, premiumProfile.isPremium]);

  const toggleNotifications = useCallback(async (value: boolean) => {
    if (value) {
      const permissionGranted = await requestReminderPermissions();
      if (!permissionGranted) {
        setNotificationsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
        Alert.alert('Notifications blocked', 'Allow notifications on your device first to turn reminders on.');
        return;
      }
    }

    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, value ? 'true' : 'false');

    if (value) {
      await syncHabitReminders(habits);
    } else {
      await cancelAllHabitReminders();
    }
  }, [habits]);

  const updatePremiumProfile = useCallback(async (updates: Partial<PremiumProfile>) => {
    const nextProfile = { ...premiumProfile, ...updates };
    setPremiumProfile(nextProfile);
    await savePremiumProfile(nextProfile);
    await refreshThemePreferences();
  }, [premiumProfile, refreshThemePreferences]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will delete every habit, note, streak, and reminder setting in the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await saveHabits([]);
            await AsyncStorage.removeItem(NOTIFICATIONS_ENABLED_KEY);
            await AsyncStorage.removeItem('defaultReminderTime');
            await savePremiumProfile(defaultPremiumProfile);
            await cancelAllHabitReminders();
            setHabits([]);
            setNotificationsEnabled(true);
            setDefaultReminderTime(DEFAULT_REMINDER_TIME);
            setPremiumProfile(defaultPremiumProfile);
            await refreshThemePreferences();
            Alert.alert('Cleared', 'The app is back to the new-user state.');
          },
        },
      ]
    );
  }, [refreshThemePreferences]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.settingsBrandRow}>
          <Image source={require('../../assets/images/user-logo.png')} style={styles.settingsLogo} contentFit="contain" />
          <View style={styles.settingsBrandCopy}>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your app-wide controls, premium plan, and habit system.</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: premiumThemePacks[premiumProfile.themePack].card }]}>
        <View style={styles.compactPremiumHeader}>
          <View style={styles.compactPremiumCopy}>
            <Text style={styles.premiumTitle}>HabitStreak {premiumProfile.isPremium ? 'Premium' : 'Free'}</Text>
            <Text style={styles.premiumSubtitle}>
              {premiumProfile.isPremium ? 'Premium features are enabled on this device.' : `Free plan: up to ${FREE_HABIT_LIMIT} habits`}
            </Text>
          </View>
        </View>
        <Text style={styles.premiumMeta}>{getSubscriptionSupportText()}</Text>
        {!premiumProfile.isPremium ? (
          <View style={styles.offerStack}>
            {subscriptionOffers.map(offer => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <View style={[styles.offerBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.offerBadgeText}>{offer.badge}</Text>
                  </View>
                </View>
                <Text style={styles.offerPrice}>{offer.price}</Text>
                <Text style={styles.offerTrial}>{offer.trial}</Text>
                <Text style={styles.offerDetail}>{offer.detail}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.premiumMeta}>Subscription billing will be added in a later release.</Text>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.activeHabits}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Habits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.totalCheckIns}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Check-ins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.longestStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.completionRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.weeklyConsistency}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weekly</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.text }]}>{overallStats.notesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Notes</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: accentColor }} />
        </View>
        <TouchableOpacity style={[styles.settingItem, styles.themeRow, { borderBottomColor: colors.border }]} onPress={() => setShowThemes(current => !current)}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Themes</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
              {premiumThemePacks[activeThemePack].label}
              {premiumProfile.isPremium ? ' active' : ' active • premium unlocks more'}
            </Text>
          </View>
          <Ionicons name={showThemes ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {showThemes ? (
          <View style={styles.themeList}>
            {Object.entries(premiumThemePacks).map(([key, pack]) => {
              const isClassic = key === 'classic';
              const isLocked = !premiumProfile.isPremium && !isClassic;
              const isActive = premiumProfile.themePack === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeCard,
                    {
                      borderColor: isActive ? accentColor : colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  onPress={() =>
                    isLocked
                      ? Alert.alert('Premium themes', 'Premium unlocks extra theme packs across the app.')
                      : updatePremiumProfile({ themePack: key as PremiumProfile['themePack'] })
                  }
                >
                  <View style={styles.themePreviewRow}>
                    <View style={[styles.themePreviewSwatch, { backgroundColor: pack.light.background }]} />
                    <View style={[styles.themePreviewSwatch, { backgroundColor: pack.light.surface }]} />
                    <View style={[styles.themePreviewSwatch, { backgroundColor: pack.accent }]} />
                    <View style={[styles.themePreviewSwatch, { backgroundColor: pack.dark.surface }]} />
                  </View>
                  <View style={styles.themeCardCopy}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>{pack.label}</Text>
                    <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>
                      {isLocked ? 'Premium only' : isActive ? 'Current theme' : 'Tap to use'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <Text style={[styles.groupLabel, { color: colors.text, marginTop: 16 }]}>Icon Style</Text>
        <View style={styles.optionWrap}>
          {Object.entries(premiumIconStyles).map(([key, icon]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.choiceChip,
                { borderColor: premiumProfile.appIconStyle === key ? accentColor : colors.border, backgroundColor: premiumProfile.appIconStyle === key ? accentColor : colors.background },
              ]}
              onPress={() => (premiumProfile.isPremium ? updatePremiumProfile({ appIconStyle: key as PremiumProfile['appIconStyle'] }) : Alert.alert('Premium personalization', 'Custom icon styles are part of Premium.'))}
            >
              <Text style={{ color: premiumProfile.appIconStyle === key ? '#fff' : colors.text }}>{icon.emoji} {icon.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminders</Text>
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
          <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#767577', true: accentColor }} />
        </View>
        <TouchableOpacity style={styles.settingItem} onPress={cycleReminderTime}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Default Reminder Time</Text>
          <Text style={[styles.settingValue, { color: colors.text }]}>{formatReminderTime(defaultReminderTime)}</Text>
        </TouchableOpacity>
        <View style={styles.customTimeRow}>
          <TextInput
            style={[styles.customTimeInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="9:15 PM"
            placeholderTextColor={colors.placeholder ?? '#999999'}
            value={customReminderTime}
            onChangeText={setCustomReminderTime}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[styles.primaryAction, styles.inlineAction, { backgroundColor: accentColor }]} onPress={addCustomReminderTime}>
            <Text style={styles.primaryActionText}>Set</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>Premium habits can stack multiple reminder times and notification styles.</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Premium Hub</Text>
        <View style={styles.hubCard}>
          <Text style={[styles.hubTitle, { color: colors.text }]}>Cloud Backup & Sync</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>Backup snapshot is available now. Cross-device sync is scaffolded as a premium hub item and ready for backend wiring.</Text>
          <TouchableOpacity onPress={handleExportData} style={[styles.primaryAction, { backgroundColor: accentColor }]}>
            <Text style={styles.primaryActionText}>Create Backup Snapshot</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.hubCard}>
          <Text style={[styles.hubTitle, { color: colors.text }]}>Coach</Text>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>{topCoach ? topCoach.weeklyReview : 'Create a habit and add notes to start building coach reviews.'}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Habit List</Text>
        {habits.length === 0 ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>No habits yet. Create one from the home tab.</Text>
        ) : (
          habits.map(habit => (
            <View key={habit.id} style={[styles.habitRow, { borderColor: colors.border }]}>
              <View style={[styles.habitDot, { backgroundColor: habit.color }]} />
              <View style={styles.habitCopy}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{habit.name}</Text>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  {habit.totalCheckIns} check-ins • longest {habit.longestStreak} • reminders {habit.reminderEnabled ? formatReminderTimes(habit.reminderTimes) : 'off'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data</Text>
        <TouchableOpacity onPress={handleExportData} style={styles.exportButton}>
          <Text style={styles.exportButtonText}>Backup Snapshot</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClearData} style={styles.dangerButton}>
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  settingsBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingsLogo: { width: 54, height: 54, borderRadius: 16 },
  settingsBrandCopy: { flex: 1 },
  title: { fontSize: 34, fontWeight: 'bold' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  section: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 16, borderWidth: 1 },
  premiumTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  premiumSubtitle: { color: '#E5E7EB', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  premiumMeta: { color: '#CBD5E1', marginBottom: 12 },
  featureList: { marginBottom: 4 },
  compactPremiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 8 },
  compactPremiumCopy: { flex: 1 },
  compactPremiumButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  compactPremiumButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  offerStack: { gap: 10, marginBottom: 4 },
  offerCard: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  offerBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  offerPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  offerTrial: { color: '#A7F3D0', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  offerDetail: { color: '#E5E7EB', fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15 },
  groupLabel: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  featureRow: { fontSize: 14, lineHeight: 21, marginBottom: 3 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#38383a' },
  settingLabel: { fontSize: 16, fontWeight: '600' },
  settingValue: { fontSize: 16 },
  helperText: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  customTimeRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  customTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 5 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  themeRow: { paddingBottom: 16 },
  themeList: { gap: 12, marginTop: 14 },
  themeCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  themePreviewRow: { flexDirection: 'row', gap: 8 },
  themePreviewSwatch: { width: 24, height: 56, borderRadius: 12 },
  themeCardCopy: { flex: 1 },
  hubCard: { marginTop: 10, paddingTop: 10 },
  hubTitle: { fontSize: 16, fontWeight: '700' },
  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  habitDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  habitCopy: { flex: 1 },
  primaryAction: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  inlineAction: { marginTop: 0, paddingHorizontal: 16 },
  primaryActionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryTestAction: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  secondaryTestActionText: { fontSize: 15, fontWeight: '700' },
  debugPanel: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  debugTitle: { fontSize: 15, fontWeight: '700' },
  debugLine: { fontSize: 12, lineHeight: 18 },
  exportButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  exportButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerButton: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  dangerButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewFill: { flex: 1 },
  previewBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  previewCard: { width: '100%', maxWidth: 380, height: '82%', borderRadius: 24, overflow: 'hidden' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1 },
  previewCloseButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewScroller: { flex: 1 },
  previewScroll: { padding: 20, paddingBottom: 32 },
  previewWidgetSmall: { alignSelf: 'center', width: 172, height: 172, borderRadius: 28, backgroundColor: '#F6EFE4', marginTop: 10, marginBottom: 18, padding: 14 },
  previewWidgetInner: { flex: 1, borderRadius: 22, padding: 14 },
  previewWidgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  previewBrand: { color: '#14213D', fontSize: 12, fontWeight: '700' },
  previewHabitTitle: { color: '#14213D', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  previewStreakValue: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  previewStatusText: { color: '#5B6475', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  previewMetaText: { color: '#5B6475', fontSize: 11 },
  previewWidgetWide: { flexDirection: 'row', borderRadius: 26, backgroundColor: '#F6EFE4', padding: 14, gap: 12, marginBottom: 18, alignItems: 'center' },
  previewWidePill: { width: 110, borderRadius: 22, paddingVertical: 14, alignItems: 'center' },
  previewWideTopLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  previewWideNumber: { color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: 2 },
  previewWideBottomLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  previewWideCopy: { flex: 1, gap: 6 },
  previewWideTitle: { color: '#14213D', fontSize: 17, fontWeight: '800' },
  previewWideStatus: { color: '#5B6475', fontSize: 12, fontWeight: '600' },
  previewWideMeta: { color: '#5B6475', fontSize: 12 },
  previewWidgetLarge: { borderRadius: 28, backgroundColor: '#14213D', padding: 18, marginBottom: 18 },
  previewPremiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewPremiumBrand: { color: '#fff', fontSize: 13, fontWeight: '700' },
  previewPremiumTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  previewPremiumStatus: { color: '#D6DEEE', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  previewPremiumStats: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  previewPremiumStatLabel: { color: '#D6DEEE', fontSize: 12, marginBottom: 4 },
  previewPremiumStatValue: { color: '#F7B955', fontSize: 24, fontWeight: '800' },
  previewPremiumStatValueLight: { color: '#fff', fontSize: 24, fontWeight: '800' },
  previewPremiumList: { gap: 8 },
  previewPremiumRow: { flexDirection: 'row', alignItems: 'center' },
  previewPremiumDot: { fontSize: 14, marginRight: 8 },
  previewPremiumRowText: { flex: 1, color: '#fff', fontSize: 12 },
  previewPremiumRowValue: { color: '#F7B955', fontSize: 12, fontWeight: '700' },
  previewLockRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  previewLockChip: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewLockChipText: { color: '#14213D', fontSize: 20, fontWeight: '800' },
  previewLockRect: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14 },
  previewLockRectTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  previewLockRectText: { fontSize: 12 },
});
