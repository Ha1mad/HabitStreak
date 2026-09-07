import { useFocusEffect } from 'expo-router/react-navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Habit,
  getCalendarHistory,
  getCoachSummary,
  getHabitStats,
  getOverallStats,
  getWeeklyHistory,
  loadHabits,
} from '../lib/habits';
import {
  PremiumProfile,
  defaultPremiumProfile,
  getPremiumMessage,
  loadPremiumProfile,
  premiumThemePacks,
  savePremiumProfile,
} from '../lib/premium';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [premiumProfile, setPremiumProfile] = useState<PremiumProfile>(defaultPremiumProfile);
  const [selectedHabitIndex, setSelectedHabitIndex] = useState(0);

  const loadData = useCallback(async () => {
    const [savedHabits, savedProfile] = await Promise.all([loadHabits(), loadPremiumProfile()]);
    setHabits(savedHabits);
    setPremiumProfile(savedProfile);
    setSelectedHabitIndex(currentIndex => Math.min(currentIndex, Math.max(0, savedHabits.length - 1)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().catch(error => console.log('Error loading insights', error));
    }, [loadData])
  );

  const currentHabit = habits[selectedHabitIndex];
  const overallStats = useMemo(() => getOverallStats(habits), [habits]);
  const habitStats = useMemo(() => (currentHabit ? getHabitStats(currentHabit) : null), [currentHabit]);
  const coachSummary = useMemo(() => (currentHabit ? getCoachSummary(currentHabit, t) : null), [currentHabit, t]);
  const calendarDays = premiumProfile.isPremium ? 35 : 5;
  const calendarHistory = useMemo(() => (currentHabit ? getCalendarHistory(currentHabit, calendarDays) : []), [currentHabit, calendarDays]);
  const weeklyHistory = useMemo(() => (currentHabit ? getWeeklyHistory(currentHabit) : []), [currentHabit]);
  const accentColor = premiumThemePacks[premiumProfile.themePack].accent;

  const handleUpgrade = useCallback(async () => {
    const nextProfile = { ...premiumProfile, isPremium: true, softPaywallSeen: true };
    setPremiumProfile(nextProfile);
    await savePremiumProfile(nextProfile);
    Alert.alert(t('Premium unlocked'), t('Insights Premium is now enabled on this device.'));
  }, [premiumProfile, t]);

  if (habits.length === 0 || !currentHabit) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('Insights')}</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            {t('Create a habit first and this page will start showing trends, streak health, coach reviews, and deeper progress summaries.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('Insights')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('A deeper look at your momentum, patterns, and coaching signals.')}</Text>
      </View>

      <View style={styles.habitPicker}>
        {habits.map((habit, index) => (
          <TouchableOpacity
            key={habit.id}
            style={[
              styles.habitChip,
              {
                backgroundColor: index === selectedHabitIndex ? habit.color : colors.surface,
                borderColor: index === selectedHabitIndex ? habit.color : colors.border,
              },
            ]}
            onPress={() => setSelectedHabitIndex(index)}
          >
            <Text style={{ color: index === selectedHabitIndex ? '#fff' : colors.text }}>{habit.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('At A Glance')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{habitStats?.monthlyCompleted ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('30-day Wins')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{habitStats?.noteUsageRate ?? 0}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Note Rate')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{habitStats?.reminderCount ?? 1}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Reminders')}</Text>
          </View>
        </View>
        <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
          {t('Overall completion across all habits: {{rate}}% • Weekly consistency: {{weekly}}%', {
            rate: overallStats.completionRate,
            weekly: overallStats.weeklyConsistency,
          })}
        </Text>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Weekly Rhythm')}</Text>
        <View style={styles.weekRow}>
          {weeklyHistory.map(day => {
            const backgroundColor = day.state === 'done' ? currentHabit.color : day.state === 'recovered' ? '#F59E0B' : colors.background;
            return (
              <View key={day.date} style={styles.weekItem}>
                <View style={[styles.weekDot, { backgroundColor, borderColor: colors.border }]}>
                  <Text style={{ color: day.state === 'missed' || day.state === 'today' ? colors.textSecondary : '#fff', fontSize: 12, fontWeight: '700' }}>
                    {day.label}
                  </Text>
                </View>
                <Text style={[styles.weekState, { color: colors.textSecondary }]}>
                  {t(day.state === 'done' ? 'Done' : day.state === 'recovered' ? 'Saved' : day.state === 'today' ? 'Today' : 'Miss')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={premiumProfile.isPremium ? 1 : 0.9}
        onPress={() => {
          if (!premiumProfile.isPremium) {
            Alert.alert(t('Premium calendar'), t('Full monthly calendar insights are part of Premium.'));
          }
        }}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Calendar View')}</Text>
        <View style={styles.calendarGrid}>
          {calendarHistory.map(day => {
            const backgroundColor = day.state === 'done' ? currentHabit.color : day.state === 'recovered' ? '#F59E0B' : colors.background;
            return (
              <View key={day.date} style={[styles.calendarCell, { backgroundColor, borderColor: colors.border }]}>
                <Text style={{ color: day.state === 'empty' ? colors.textSecondary : '#fff', fontSize: 10, fontWeight: '700' }}>{day.displayLabel}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
          {premiumProfile.isPremium
            ? t('Your last 35 days of check-ins and recovery saves.')
            : t('Free preview shows the last 5 days. Upgrade to unlock the full interactive history calendar.')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={premiumProfile.isPremium ? 1 : 0.9}
        onPress={() => {
          if (!premiumProfile.isPremium) {
            Alert.alert(t('Premium coach'), t('Coach reviews and pattern summaries are part of Premium.'));
          }
        }}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Coach Review')}</Text>
        {premiumProfile.isPremium && coachSummary ? (
          <>
            <Text style={[styles.coachHeadline, { color: colors.text }]}>{coachSummary.headline}</Text>
            <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{coachSummary.weeklyReview}</Text>
            <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{coachSummary.noteSummary}</Text>
            <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{coachSummary.suggestion}</Text>
          </>
        ) : (
          <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Upgrade to unlock weekly reviews, note summaries, and deeper coaching suggestions.')}</Text>
        )}
      </TouchableOpacity>

      {!premiumProfile.isPremium ? (
        <View style={[styles.premiumCard, { backgroundColor: premiumThemePacks[premiumProfile.themePack].card }]}>
          <Text style={styles.premiumTitle}>{t('Insights Premium')}</Text>
          <Text style={styles.premiumCopy}>{t(getPremiumMessage())}</Text>
          <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: accentColor }]} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>{t('Unlock Premium')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  habitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  habitChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  sectionCard: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  helperCopy: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekItem: { alignItems: 'center', gap: 8 },
  weekDot: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekState: { fontSize: 11 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  calendarCell: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  coachHeadline: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  premiumCard: { borderRadius: 24, padding: 20, marginTop: 8 },
  premiumTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  premiumCopy: { color: '#E5E7EB', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  upgradeButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  upgradeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyCard: { borderWidth: 1, borderRadius: 24, padding: 24 },
  emptyTitle: { fontSize: 28, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  emptyCopy: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
