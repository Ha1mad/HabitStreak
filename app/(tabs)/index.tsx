import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_REMINDER_TIME,
  Habit,
  NOTIFICATION_STYLE_OPTIONS,
  PROTECTION_MODE_OPTIONS,
  REMINDER_TIME_OPTIONS,
  applyRecoveryPass,
  completeHabitCheckIn,
  createHabit,
  formatReminderTime,
  formatReminderTimes,
  getCalendarHistory,
  getHabitStats,
  getHabitStatus,
  getHabitStatusText,
  getRecentNotes,
  getWeeklyHistory,
  loadHabits,
  moveHabit,
  saveHabits,
  updateHabit,
} from '../lib/habits';
import {
  PremiumProfile,
  canCreateAnotherHabit,
  defaultPremiumProfile,
  loadPremiumProfile,
  premiumFeatureGroups,
  premiumThemePacks,
  savePremiumProfile,
} from '../lib/premium';
import { NOTIFICATIONS_ENABLED_KEY, requestReminderPermissions, syncHabitReminders } from '../lib/reminders';
import {
  getPremiumCtaLabel,
  getSubscriptionSupportText,
  INSTALL_STARTED_AT_KEY,
  isExpoGoEnvironment,
  subscriptionOffers,
  WELCOME_PROMO_WINDOW_DAYS,
} from '../lib/subscriptions';
import { syncHabitWidgets } from '../lib/widget-sync';

const PRESET_COLORS = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#00C7BE', '#FFD60A', '#FF453A'];
const PREMIUM_COLORS = [
  '#0EA5E9',
  '#2563EB',
  '#1D4ED8',
  '#7C3AED',
  '#A855F7',
  '#EC4899',
  '#F43F5E',
  '#DC2626',
  '#F97316',
  '#FB7185',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#38BDF8',
  '#64748B',
  '#475569',
  '#6D28D9',
  '#9333EA',
  '#BE185D',
  '#B45309',
];

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

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [premiumProfile, setPremiumProfile] = useState<PremiumProfile>(defaultPremiumProfile);
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showExpandedColors, setShowExpandedColors] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [habitName, setHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [defaultReminderTime, setDefaultReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [reminderTimes, setReminderTimes] = useState<string[]>([DEFAULT_REMINDER_TIME]);
  const [customReminderTime, setCustomReminderTime] = useState('');
  const [notificationStyle, setNotificationStyle] = useState<'gentle' | 'focus' | 'persistent'>('gentle');
  const [protectionMode, setProtectionMode] = useState<'standard' | 'shield'>('standard');
  const [noteDraft, setNoteDraft] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [paywallReason, setPaywallReason] = useState(() => t('Unlock premium to keep growing.'));
  const [isWelcomePromoActive, setIsWelcomePromoActive] = useState(true);
  const [welcomePromoDaysLeft, setWelcomePromoDaysLeft] = useState(WELCOME_PROMO_WINDOW_DAYS);
  const [swipeX] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const currentHabitIndexRef = useRef(0);
  const habitsLengthRef = useRef(0);

  const accentColor = premiumThemePacks[premiumProfile.themePack].accent;
  const extraPremiumColors = PREMIUM_COLORS.filter(color => !PRESET_COLORS.includes(color));

  const hydrate = useCallback(async () => {
    try {
      const [savedHabits, savedReminderTime, savedProfile, savedInstallStartedAt] = await Promise.all([
        loadHabits(),
        AsyncStorage.getItem('defaultReminderTime'),
        loadPremiumProfile(),
        AsyncStorage.getItem(INSTALL_STARTED_AT_KEY),
      ]);
      const installStartedAt = savedInstallStartedAt ? Number(savedInstallStartedAt) : Date.now();
      if (!savedInstallStartedAt) {
        await AsyncStorage.setItem(INSTALL_STARTED_AT_KEY, installStartedAt.toString());
      }
      const promoWindowMs = WELCOME_PROMO_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const elapsedMs = Date.now() - installStartedAt;
      setIsWelcomePromoActive(elapsedMs <= promoWindowMs);
      setWelcomePromoDaysLeft(Math.max(1, Math.ceil((promoWindowMs - elapsedMs) / (24 * 60 * 60 * 1000))));
      setHabits(savedHabits);
      setDefaultReminderTime(savedReminderTime || DEFAULT_REMINDER_TIME);
      setPremiumProfile(savedProfile);
      void syncHabitReminders(savedHabits);
      void syncHabitWidgets(savedHabits, savedProfile);
    } catch (error) {
      console.log('Error loading app state', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Hydrate persisted state after the initial render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate])
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveHabits(habits).catch(error => console.log('Error saving habits', error));
    void syncHabitReminders(habits);
    void syncHabitWidgets(habits, premiumProfile);
  }, [habits, isLoaded, premiumProfile]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    savePremiumProfile(premiumProfile).catch(error => console.log('Error saving premium profile', error));
    void syncHabitWidgets(habits, premiumProfile);
  }, [habits, isLoaded, premiumProfile]);

  useEffect(() => {
    if (habits.length === 0 && currentHabitIndex !== 0) {
      // Keep the selected habit valid after deletion.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentHabitIndex(0);
      return;
    }

    if (currentHabitIndex > habits.length - 1) {
      // Keep the selected habit valid after deletion.
      setCurrentHabitIndex(Math.max(0, habits.length - 1));
    }
  }, [currentHabitIndex, habits.length]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const currentHabit = useMemo(() => habits[currentHabitIndex], [habits, currentHabitIndex]);
  const currentStatus = useMemo(() => (currentHabit ? getHabitStatus(currentHabit) : null), [currentHabit]);
  const currentStats = useMemo(() => (currentHabit ? getHabitStats(currentHabit) : null), [currentHabit]);
  const weeklyHistory = useMemo(() => (currentHabit ? getWeeklyHistory(currentHabit) : []), [currentHabit]);
  const calendarHistory = useMemo(() => (currentHabit ? getCalendarHistory(currentHabit) : []), [currentHabit]);
  const recentNotes = useMemo(() => (currentHabit ? getRecentNotes(currentHabit) : []), [currentHabit]);

  useEffect(() => {
    currentHabitIndexRef.current = currentHabitIndex;
    habitsLengthRef.current = habits.length;
  }, [currentHabitIndex, habits.length]);

  const openPaywall = useCallback((reason: string) => {
    setPaywallReason(reason);
    setShowPaywallModal(true);
  }, []);

  const resetHabitForm = useCallback(() => {
    setEditingHabitId(null);
    setHabitName('');
    setSelectedColor(PRESET_COLORS[0]);
    setReminderEnabled(false);
    setReminderTime(defaultReminderTime);
    setReminderTimes([defaultReminderTime]);
    setCustomReminderTime('');
    setNotificationStyle('gentle');
    setProtectionMode('standard');
  }, [defaultReminderTime]);

  const openCreateModal = useCallback(() => {
    if (!canCreateAnotherHabit(premiumProfile.isPremium, habits.length)) {
      openPaywall(t('Free plan includes up to 2 habits. Upgrade for unlimited habits.'));
      return;
    }

    resetHabitForm();
    setShowExpandedColors(false);
    setShowHabitModal(true);
  }, [habits.length, openPaywall, premiumProfile.isPremium, resetHabitForm, t]);

  const openEditModal = useCallback(() => {
    if (!currentHabit) {
      return;
    }

    setEditingHabitId(currentHabit.id);
    setHabitName(currentHabit.name);
    setSelectedColor(currentHabit.color);
    setReminderEnabled(currentHabit.reminderEnabled);
    setReminderTime(currentHabit.reminderTime);
    setReminderTimes(currentHabit.reminderTimes);
    setCustomReminderTime('');
    setNotificationStyle(currentHabit.notificationStyle);
    setProtectionMode(currentHabit.protectionMode);
    setShowExpandedColors(false);
    setShowHabitModal(true);
  }, [currentHabit]);

  const toggleReminderSlot = useCallback(
    (option: string) => {
      if (!premiumProfile.isPremium) {
        openPaywall(t('Multiple reminder times are part of Premium reminders.'));
        return;
      }

      setReminderTimes(currentSlots => {
        if (currentSlots.includes(option)) {
          return currentSlots.length === 1 ? currentSlots : currentSlots.filter(item => item !== option);
        }

        return [...currentSlots, option].sort();
      });
    },
    [openPaywall, premiumProfile.isPremium, t]
  );

  const handleAddCustomReminderTime = useCallback(() => {
    if (!premiumProfile.isPremium) {
      openPaywall(t('Custom reminder times are part of Premium reminders.'));
      return;
    }

    const normalizedTime = normalizeReminderInput(customReminderTime);

    if (!normalizedTime) {
      Alert.alert(t('Invalid time'), t('Use a time like 6:45 AM, 9:15 PM, or 21:15.'));
      return;
    }

    setReminderTimes(currentSlots => {
      if (currentSlots.includes(normalizedTime)) {
        return currentSlots;
      }

      return [...currentSlots, normalizedTime].sort();
    });
    setCustomReminderTime('');
  }, [customReminderTime, openPaywall, premiumProfile.isPremium, t]);

  const handleSaveHabit = useCallback(() => {
    const performSave = async () => {
      if (reminderEnabled) {
        const notificationsEnabled = (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) !== 'false';

        if (notificationsEnabled) {
          const permissionGranted = await requestReminderPermissions();
          if (!permissionGranted) {
            Alert.alert(
              t('Notifications blocked'),
              t('Allow notifications first if you want reminder alerts to appear on your device.')
            );
            return;
          }
        }
      }

      const sharedUpdates = {
        name: habitName.trim(),
        color: selectedColor,
        reminderEnabled,
        reminderTime: reminderTimes[0] ?? reminderTime,
        reminderTimes: premiumProfile.isPremium ? reminderTimes : [reminderTime],
        notificationStyle: premiumProfile.isPremium ? notificationStyle : 'gentle',
        protectionMode: premiumProfile.isPremium ? protectionMode : 'standard',
      } as const;

      if (editingHabitId) {
        setHabits(currentHabits =>
          currentHabits.map(habit => (habit.id === editingHabitId ? updateHabit(habit, sharedUpdates) : habit))
        );
      } else {
        const newHabit = updateHabit(createHabit(habitName, selectedColor), sharedUpdates);
        const nextIndex = habits.length;
        setHabits(currentHabits => [...currentHabits, newHabit]);
        setCurrentHabitIndex(nextIndex);
      }

      setShowHabitModal(false);
      resetHabitForm();
    };

    if (!habitName.trim()) {
      Alert.alert(t('Name required'), t('Give your habit a name first.'));
      return;
    }

    if (!editingHabitId && !canCreateAnotherHabit(premiumProfile.isPremium, habits.length)) {
      openPaywall(t('Upgrade to add more than 2 habits.'));
      return;
    }

    performSave().catch(error => {
      console.log('Error saving habit with reminders', error);
      Alert.alert(t('Reminder error'), t('Something went wrong while saving the reminder setup.'));
    });
  }, [
    editingHabitId,
    habitName,
    habits.length,
    notificationStyle,
    openPaywall,
    premiumProfile.isPremium,
    protectionMode,
    reminderEnabled,
    reminderTime,
    reminderTimes,
    resetHabitForm,
    selectedColor,
    t,
  ]);

  const handleDeleteHabit = useCallback(() => {
    if (!habitToDelete) {
      return;
    }

    setHabits(currentHabits => currentHabits.filter(habit => habit.id !== habitToDelete));
    setShowDeleteConfirm(false);
    setShowHabitModal(false);
    setHabitToDelete(null);
  }, [habitToDelete]);

  const handleMoveHabit = useCallback((direction: 'left' | 'right') => {
    setHabits(currentHabits => moveHabit(currentHabits, currentHabitIndexRef.current, direction));
    setCurrentHabitIndex(index => (direction === 'left' ? Math.max(0, index - 1) : Math.min(habitsLengthRef.current - 1, index + 1)));
  }, []);

  const handleOpenCheckIn = useCallback(() => {
    if (!currentHabit || !currentStatus) {
      return;
    }

    if (currentStatus.recoverable) {
      Alert.alert(t('Recovery needed'), t('Use a skip pass first, then you can check in for today.'));
      return;
    }

    if (currentStatus.isDoneToday) {
      Alert.alert(t('Already done'), t('You already checked in for this habit today.'));
      return;
    }

    setNoteDraft('');
    setShowCheckInModal(true);
  }, [currentHabit, currentStatus, t]);

  const handleConfirmCheckIn = useCallback(() => {
    if (!currentHabit) {
      return;
    }

    const updatedHabit = completeHabitCheckIn(currentHabit, noteDraft);
    setHabits(currentHabits => currentHabits.map(habit => (habit.id === currentHabit.id ? updatedHabit : habit)));
    setShowCheckInModal(false);
    setNoteDraft('');

    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [currentHabit, noteDraft, scaleAnim]);

  const handleUseRecoveryPass = useCallback(() => {
    if (!currentHabit || !currentStatus?.recoverable) {
      return;
    }

    const updatedHabit = applyRecoveryPass(currentHabit);
    setHabits(currentHabits => currentHabits.map(habit => (habit.id === currentHabit.id ? updatedHabit : habit)));
    Alert.alert(t('Streak saved'), t('Your streak protection covered the miss. You can check in again now.'));
  }, [currentHabit, currentStatus, t]);

  const handleSwipeGesture = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: {
              translationX: swipeX,
            },
          },
        ],
        { useNativeDriver: true }
      ),
    [swipeX]
  );

  const handleSwipeStateChange = useCallback(
    ({ nativeEvent }: { nativeEvent: { oldState: number; translationX: number } }) => {
      if (nativeEvent.oldState !== State.ACTIVE) {
        return;
      }

      const threshold = 50;
      if (nativeEvent.translationX > threshold && currentHabitIndexRef.current > 0) {
        setCurrentHabitIndex(prev => prev - 1);
      } else if (nativeEvent.translationX < -threshold && currentHabitIndexRef.current < habitsLengthRef.current - 1) {
        setCurrentHabitIndex(prev => prev + 1);
      }

      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
    },
    [swipeX]
  );

  const handleUpgrade = useCallback(() => {
    setPremiumProfile(current => ({ ...current, isPremium: true, softPaywallSeen: true }));
    setShowPaywallModal(false);
    Alert.alert(
      isExpoGoEnvironment() ? t('Premium preview enabled') : t('Premium unlocked'),
      isExpoGoEnvironment()
        ? t('Premium preview is now enabled on this device. Real store billing will be connected in your development build later.')
        : t('Premium features are now enabled on this device.')
    );
  }, [t]);

  const renderPaywallModal = () => (
    <Modal visible={showPaywallModal} transparent animationType="fade" onRequestClose={() => setShowPaywallModal(false)}>
      <View style={styles.modalFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPaywallModal(false)} />
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
          <View style={[styles.modalScrollCard, { backgroundColor: colors.modalContent, minHeight: 0, maxHeight: '84%' }]}>
            <ScrollView
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>HabitStreak {t('Premium')}</Text>
              <Text style={[styles.confirmText, { color: colors.textSecondary }]}>{paywallReason}</Text>
              <Text style={[styles.paywallMessage, { color: colors.text }]}>{t('Unlock more habits, smarter reminders, deeper insights, and more control over your streak system.')}</Text>
              <Text style={[styles.helperCopy, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
                {t(getSubscriptionSupportText())}
              </Text>
              <Text style={[styles.helperCopy, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
                {t('Free trial availability depends on store eligibility. The welcome offer is shown only during the first week in the app.')}
              </Text>
              <View style={styles.offerStack}>
                {subscriptionOffers.map(offer => (
                  <View key={offer.id} style={[styles.offerCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={styles.offerHeader}>
                      <Text style={[styles.offerTitle, { color: colors.text }]}>{t(offer.title)}</Text>
                      <View style={[styles.offerBadge, { backgroundColor: accentColor }]}>
                        <Text style={styles.offerBadgeText}>{t(offer.badge)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.offerPrice, { color: colors.text }]}>{offer.price}</Text>
                    <Text style={[styles.offerTrial, { color: accentColor }]}>{t(offer.trial)}</Text>
                    <Text style={[styles.offerDetail, { color: colors.textSecondary }]}>{t(offer.detail)}</Text>
                  </View>
                ))}
              </View>
              {premiumFeatureGroups.premium.map(feature => (
                <Text key={feature} style={[styles.paywallFeature, { color: colors.textSecondary }]}>
                  • {t(feature)}
                </Text>
              ))}
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentColor }]} onPress={handleUpgrade}>
                <Text style={styles.primaryButtonText}>{t(getPremiumCtaLabel(false))}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setPremiumProfile(current => ({ ...current, softPaywallSeen: true }));
                  setShowPaywallModal(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('Skip for now')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPlanModal = () => (
    <Modal visible={showPlanModal} transparent animationType="fade" onRequestClose={() => setShowPlanModal(false)}>
      <View style={styles.modalFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPlanModal(false)} />
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.modalScrollCard, { backgroundColor: colors.modalContent, minHeight: 0, maxHeight: '78%' }]}>
              <ScrollView
                showsVerticalScrollIndicator
                nestedScrollEnabled
                bounces
                contentContainerStyle={styles.modalScrollContent}
              >
              <View style={styles.modalTopRow}>
                <View style={styles.modalTopSpacer} />
                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowPlanModal(false)}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Plans')}</Text>
              <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                {t('Free gives you the core HabitStreak experience. Premium unlocks more habits, stronger reminders, deeper insights, and extra personalization.')}
              </Text>
              <Text style={[styles.planGroupTitle, { color: colors.text }]}>{t('Free')}</Text>
              {premiumFeatureGroups.free.map(feature => (
                <Text key={feature} style={[styles.paywallFeature, { color: colors.textSecondary }]}>
                  • {t(feature)}
                </Text>
              ))}
              <Text style={[styles.planGroupTitle, { color: colors.text, marginTop: 14 }]}>{t('Premium')}</Text>
              {premiumFeatureGroups.premium.map(feature => (
                <Text key={feature} style={[styles.paywallFeature, { color: colors.textSecondary }]}>
                  • {t(feature)}
                </Text>
              ))}
              {!premiumProfile.isPremium ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={() => {
                    setShowPlanModal(false);
                    openPaywall(t('Upgrade whenever you want more habits, richer reminders, and deeper insights.'));
                  }}
                >
                  <Text style={styles.primaryButtonText}>{t(getPremiumCtaLabel(false))}</Text>
                </TouchableOpacity>
              ) : null}
              {premiumProfile.isPremium ? (
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPlanModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('Close')}</Text>
                </TouchableOpacity>
              ) : null}
              </ScrollView>
            </View>
        </View>
      </View>
    </Modal>
  );

  const renderCalendarModal = () => (
    <Modal visible={showCalendarModal} transparent animationType="fade" onRequestClose={() => setShowCalendarModal(false)}>
      <TouchableOpacity style={styles.modalFill} activeOpacity={1} onPress={() => setShowCalendarModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
          <TouchableOpacity activeOpacity={1} onPress={event => event.stopPropagation()}>
            <View style={[styles.calendarCard, { backgroundColor: colors.modalContent }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Full History')}</Text>
              <View style={styles.calendarGrid}>
                {calendarHistory.map(day => {
                  const bg =
                    day.state === 'done'
                      ? currentHabit?.color
                      : day.state === 'recovered'
                        ? '#F59E0B'
                        : colors.surface;
                  return (
                    <View key={day.date} style={[styles.calendarCell, { backgroundColor: bg, borderColor: colors.border }]}>
                      <Text style={{ color: day.state === 'empty' ? colors.textSecondary : '#fff', fontSize: 12, fontWeight: '700' }}>
                        {day.displayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
                {t('Premium calendar view shows the last 35 days of check-ins and protected saves.')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderHabitModal = () => {
    const isEditing = Boolean(editingHabitId);
    const atFirstHabit = currentHabitIndex === 0;
    const atLastHabit = currentHabitIndex === habits.length - 1;
    const shouldUseScrollableLayout = reminderEnabled;

    const modalContent = (
      <>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{isEditing ? t('Edit Habit') : t('Create Habit')}</Text>

        <TextInput
          style={[styles.input, { color: colors.text, borderBottomColor: colors.inputBorder }]}
          placeholder={t('Habit name')}
          placeholderTextColor={colors.placeholder}
          value={habitName}
          onChangeText={setHabitName}
          returnKeyType="done"
          onSubmitEditing={handleSaveHabit}
        />

        <TouchableOpacity
          style={styles.colorPreview}
          onPress={() => {
            Keyboard.dismiss();
            setShowHabitModal(false);
            setShowColorModal(true);
          }}
        >
          <View style={styles.row}>
            <View style={[styles.colorPreviewCircle, { backgroundColor: selectedColor }]} />
            <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>{t('Color')}</Text>
          </View>
          <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>{t('Choose')}</Text>
        </TouchableOpacity>

        <View style={[styles.preferenceRow, { borderColor: colors.border }]}>
          <Text style={[styles.inlineLabel, { color: colors.text }]}>{t('Reminder')}</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={value => {
              Keyboard.dismiss();
              setReminderEnabled(value);
            }}
            trackColor={{ false: '#767577', true: accentColor }}
          />
        </View>

        {reminderEnabled ? (
          <>
            <Text style={[styles.formSectionLabel, { color: colors.text }]}>{t('Reminder time')}</Text>
            <View style={styles.timeOptions}>
              {REMINDER_TIME_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.timeChip,
                    {
                      backgroundColor: (premiumProfile.isPremium ? reminderTimes.includes(option) : reminderTime === option) ? accentColor : colors.surface,
                      borderColor: (premiumProfile.isPremium ? reminderTimes.includes(option) : reminderTime === option) ? accentColor : colors.border,
                    },
                  ]}
                  onPress={() => (premiumProfile.isPremium ? toggleReminderSlot(option) : setReminderTime(option))}
                >
                  <Text style={{ color: (premiumProfile.isPremium ? reminderTimes.includes(option) : reminderTime === option) ? '#fff' : colors.text }}>
                    {formatReminderTime(option)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {premiumProfile.isPremium ? (
              <>
                <Text style={[styles.formSectionLabel, { color: colors.text }]}>{t('Notification style')}</Text>
                <View style={styles.timeOptions}>
                  {NOTIFICATION_STYLE_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: notificationStyle === option ? accentColor : colors.surface,
                          borderColor: notificationStyle === option ? accentColor : colors.border,
                        },
                      ]}
                      onPress={() => setNotificationStyle(option)}
                    >
                      <Text style={{ color: notificationStyle === option ? '#fff' : colors.text }}>{t(option)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.formSectionLabel, { color: colors.text }]}>{t('Add custom time')}</Text>
                <View style={styles.customTimeRow}>
                  <TextInput
                    style={[styles.customTimeInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="9:15 PM"
                    placeholderTextColor={colors.placeholder}
                    value={customReminderTime}
                    onChangeText={setCustomReminderTime}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                  />
                  <TouchableOpacity style={[styles.addTimeButton, { backgroundColor: accentColor }]} onPress={handleAddCustomReminderTime}>
                    <Text style={styles.addTimeButtonText}>{t('Add')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Premium can use any reminder time you want.')}</Text>
                <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Try `6:45 AM`, `9:15 PM`, or `21:15`.')}</Text>
              </>
            ) : (
              <TouchableOpacity style={[styles.lockedStrip, { borderColor: colors.border }]} onPress={() => openPaywall(t('Premium reminders support multiple times and stronger notification controls.'))}>
                <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Premium unlocks multiple reminder times and stronger notification controls.')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}

        <Text style={[styles.formSectionLabel, { color: colors.text }]}>{t('Streak protection')}</Text>
        {premiumProfile.isPremium ? (
          <View style={styles.timeOptions}>
            {PROTECTION_MODE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: protectionMode === option ? accentColor : colors.surface,
                    borderColor: protectionMode === option ? accentColor : colors.border,
                  },
                ]}
                onPress={() => setProtectionMode(option)}
              >
                <Text style={{ color: protectionMode === option ? '#fff' : colors.text }}>{t(option)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity style={[styles.lockedStrip, { borderColor: colors.border }]} onPress={() => openPaywall(t('Premium adds deeper streak protection and shield mode.'))}>
            <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Free plan uses standard protection. Premium adds shield mode and bigger recovery reserves.')}</Text>
          </TouchableOpacity>
        )}

        {isEditing && habits.length > 1 ? (
          <View style={styles.reorderRow}>
            <TouchableOpacity style={[styles.secondaryButton, atFirstHabit && styles.disabledButton]} disabled={atFirstHabit} onPress={() => handleMoveHabit('left')}>
              <Text style={styles.secondaryButtonText}>{t('Move Left')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, atLastHabit && styles.disabledButton]} disabled={atLastHabit} onPress={() => handleMoveHabit('right')}>
              <Text style={styles.secondaryButtonText}>{t('Move Right')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentColor }]} onPress={handleSaveHabit}>
          <Text style={styles.primaryButtonText}>{isEditing ? t('Save Changes') : t('Create Habit')}</Text>
        </TouchableOpacity>

        {isEditing ? (
          <TouchableOpacity
            style={styles.deleteTextButton}
            onPress={() => {
              setHabitToDelete(editingHabitId);
              setShowDeleteConfirm(true);
            }}
          >
            <Text style={styles.deleteText}>{t('Delete Habit')}</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );

    return (
      <Modal visible={showHabitModal} transparent animationType="fade" onRequestClose={() => setShowHabitModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          style={styles.modalFill}
        >
          <TouchableOpacity style={styles.modalFill} activeOpacity={1} onPress={() => setShowHabitModal(false)}>
            <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
              <TouchableOpacity activeOpacity={1} onPress={event => event.stopPropagation()}>
                {shouldUseScrollableLayout ? (
                  <View style={[styles.modalScrollCard, { backgroundColor: colors.modalContent }]}>
                    <ScrollView
                      contentContainerStyle={styles.modalScrollContent}
                      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {modalContent}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={[styles.modalCard, { backgroundColor: colors.modalContent }]}>{modalContent}</View>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderColorModal = () => (
    <Modal visible={showColorModal} transparent animationType="fade" onRequestClose={() => setShowColorModal(false)}>
      <TouchableOpacity
        style={styles.modalFill}
        activeOpacity={1}
        onPress={() => {
          setShowExpandedColors(false);
          setShowColorModal(false);
          setShowHabitModal(true);
        }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
          <TouchableOpacity activeOpacity={1} onPress={event => event.stopPropagation()}>
            <View style={[styles.colorModalCard, { backgroundColor: colors.modalContent }]}>
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Choose a Color')}</Text>
                <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                  {premiumProfile.isPremium ? t('Premium unlocks a bigger color palette for every habit.') : t('Pick a color that feels right for this habit.')}
                </Text>
                <View style={styles.colorGrid}>
                  {Array.from(new Set([...PRESET_COLORS, selectedColor])).map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColor]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color ? <Text style={styles.colorCheck}>✓</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
                {premiumProfile.isPremium ? (
                  <>
                    {showExpandedColors || (selectedColor && extraPremiumColors.includes(selectedColor)) ? (
                      <View style={styles.expandedColorsSection}>
                        <Text style={[styles.formSectionLabel, { color: colors.text }]}>{t('More premium colors')}</Text>
                        <View style={styles.colorGrid}>
                          {Array.from(new Set([...extraPremiumColors, selectedColor])).map(color => (
                            <TouchableOpacity
                              key={color}
                              style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColor]}
                              onPress={() => setSelectedColor(color)}
                            >
                              {selectedColor === color ? <Text style={styles.colorCheck}>✓</Text> : null}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.moreColorsButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setShowExpandedColors(true)}>
                        <Text style={[styles.moreColorsText, { color: colors.text }]}>{t('View more colors')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}
                {!premiumProfile.isPremium ? (
                  <TouchableOpacity style={[styles.lockedStrip, { borderColor: colors.border }]} onPress={() => openPaywall(t('Premium unlocks a much bigger color palette for your habits.'))}>
                    <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>{t('Premium adds a full expanded color palette instead of only the starter colors.')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: accentColor }]}
                  onPress={() => {
                    setShowExpandedColors(false);
                    setShowColorModal(false);
                    setShowHabitModal(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>{t('Use This Color')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
      <TouchableOpacity style={styles.modalFill} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
          <TouchableOpacity activeOpacity={1} onPress={event => event.stopPropagation()}>
            <View style={[styles.modalCard, { backgroundColor: colors.modalContent }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Delete Habit?')}</Text>
              <Text style={[styles.confirmText, { color: colors.textSecondary }]}>{t('This removes the habit, its history, and all saved notes.')}</Text>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#FF3B30' }]} onPress={handleDeleteHabit}>
                <Text style={styles.primaryButtonText}>{t('Delete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderCheckInModal = () => (
    <Modal visible={showCheckInModal} transparent animationType="fade" onRequestClose={() => setShowCheckInModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalFill}>
        <TouchableOpacity style={styles.modalFill} activeOpacity={1} onPress={() => setShowCheckInModal(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackground }]}>
            <TouchableOpacity activeOpacity={1} onPress={event => event.stopPropagation()}>
              <View style={[styles.modalCard, { backgroundColor: colors.modalContent }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t("Today's Check-in")}</Text>
                <Text style={[styles.confirmText, { color: colors.textSecondary }]}>{t('Add a short note if you want to remember how today went.')}</Text>
                <TextInput
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder={t('Worked out for 20 min')}
                  placeholderTextColor={colors.placeholder}
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  multiline
                />
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: currentHabit?.color ?? accentColor }]} onPress={handleConfirmCheckIn}>
                  <Text style={styles.primaryButtonText}>{t('Complete Check-in')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!currentHabit) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={require('../../assets/images/user-logo.png')} style={styles.introLogo} contentFit="contain" />
          <Text style={[styles.introTitle, { color: colors.text }]}>{t('Welcome to HabitStreak')}</Text>
          <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>{t('Start with one habit, check in once a day, and build consistency over time.')}</Text>
          <View style={styles.introSteps}>
            <Text style={[styles.introStep, { color: colors.text }]}>{t('1. Name your first habit')}</Text>
            <Text style={[styles.introStep, { color: colors.text }]}>{t('2. Choose a color and reminder')}</Text>
            <Text style={[styles.introStep, { color: colors.text }]}>{t('3. Add quick notes after check-ins')}</Text>
          </View>
          {!premiumProfile.softPaywallSeen && isWelcomePromoActive ? (
            <TouchableOpacity
              style={[styles.softPaywallCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => openPaywall(t('Premium is optional, but it unlocks the full HabitStreak system when you are ready.'))}
            >
              <Text style={[styles.softPaywallTitle, { color: colors.text }]}>{t('Try HabitStreak Premium')}</Text>
              <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
                {t('Unlimited habits, smarter reminders, full calendar history, widgets, premium themes, and deeper streak protection.')}
              </Text>
              <Text style={[styles.helperCopy, { color: colors.textSecondary, marginTop: 8 }]}>
                {t('Welcome offer ends in {{days}} {{unit}} • 3-day free trial for eligible new subscribers • Monthly $4.99 • Yearly $29.99', {
                  days: welcomePromoDaysLeft,
                  unit: t(welcomePromoDaysLeft === 1 ? 'day' : 'days'),
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accentColor }]} onPress={openCreateModal}>
            <Text style={styles.primaryButtonText}>{t('Create Your First Habit')}</Text>
          </TouchableOpacity>
        </View>
        {renderHabitModal()}
        {renderColorModal()}
        {renderDeleteModal()}
        {renderPaywallModal()}
      </View>
    );
  }

  const statusText = getHabitStatusText(currentHabit, t);
  const buttonDisabled = !currentStatus || currentStatus.isDoneToday || currentStatus.recoverable;
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: accentColor }]} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowPlanModal(true)}>
            <Ionicons name={premiumProfile.isPremium ? 'diamond-outline' : 'pricetag-outline'} size={16} color={colors.text} />
            <Text style={[styles.planButtonText, { color: colors.text }]}>{premiumProfile.isPremium ? t('Premium') : t('Plans')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.habitName, { color: colors.text }]}>{currentHabit.name}</Text>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusText}</Text>
          <Text style={[styles.subtleText, { color: colors.textSecondary }]}>
            {currentHabit.reminderEnabled ? `${t('Reminders')}: ${formatReminderTimes(currentHabit.reminderTimes)}` : t('Reminders off')}
          </Text>
        </View>

        <PanGestureHandler activeOffsetX={[-20, 20]} failOffsetY={[-12, 12]} onGestureEvent={handleSwipeGesture} onHandlerStateChange={handleSwipeStateChange}>
          <Animated.View style={[styles.swipeContainer, { transform: [{ translateX: swipeX }] }]}>
            <Animated.View
              style={[
                styles.circle,
                {
                  backgroundColor: currentHabit.color,
                  shadowColor: currentHabit.color,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <TouchableOpacity onPress={handleOpenCheckIn} style={[styles.circleButton, buttonDisabled && styles.disabledCircle]}>
                <Text style={styles.streakValue}>{currentHabit.streak}</Text>
                <Text style={styles.streakLabel}>{t('day streak')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>

        {habits.length > 1 ? (
          <View style={styles.dotsContainer}>
            {habits.map((habit, index) => (
              <TouchableOpacity key={habit.id} onPress={() => setCurrentHabitIndex(index)}>
                <View style={[styles.dot, { backgroundColor: index === currentHabitIndex ? habit.color : colors.border, width: index === currentHabitIndex ? 24 : 8 }]} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {habits.length > 1 ? <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>{t('Swipe for the other habit')}</Text> : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={openEditModal}>
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>{t('Edit')}</Text>
          </TouchableOpacity>
          {currentStatus?.recoverable ? (
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: currentHabit.color, backgroundColor: colors.surface }]} onPress={handleUseRecoveryPass}>
              <Text style={[styles.secondaryActionText, { color: currentHabit.color }]}>{t('Use Protection ({{count}})', { count: currentHabit.recoverySkipsAvailable })}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.recoveryBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.recoveryText, { color: colors.textSecondary }]}>
                {currentHabit.protectionMode === 'shield' ? t('Shield mode') : t('Standard mode')} • {currentHabit.recoverySkipsAvailable} {t('saves')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{currentStats?.longestStreak ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Longest')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{currentStats?.totalCheckIns ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Check-ins')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{currentStats?.completionRate ?? 0}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Completion')}</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('This Week')}</Text>
          <View style={styles.weekRow}>
            {weeklyHistory.map(day => {
              const backgroundColor = day.state === 'done' ? currentHabit.color : day.state === 'recovered' ? '#F59E0B' : colors.background;
              return (
                <View key={day.date} style={styles.weekItem}>
                  <View style={[styles.weekDot, { backgroundColor, borderColor: colors.border }]}>
                    <Text style={[styles.weekDotText, { color: day.state === 'missed' || day.state === 'today' ? colors.textSecondary : '#fff' }]}>{day.label}</Text>
                  </View>
                  <Text style={[styles.weekState, { color: colors.textSecondary }]}>{t(day.state === 'done' ? 'Done' : day.state === 'recovered' ? 'Saved' : day.state === 'today' ? 'Today' : 'Miss')}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.inlineFootnote, { color: colors.textSecondary }]}>{t('Weekly consistency: {{value}}%', { value: currentStats?.weeklyConsistency ?? 0 })}</Text>
        </View>

        <TouchableOpacity
          style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => (premiumProfile.isPremium ? setShowCalendarModal(true) : openPaywall(t('Full calendar history is a Premium feature.')))}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Full History / Calendar')}</Text>
          <View style={styles.calendarPreviewGrid}>
            {calendarHistory.slice(-14).map(day => {
              const bg =
                day.state === 'done'
                  ? currentHabit.color
                  : day.state === 'recovered'
                    ? '#F59E0B'
                    : colors.background;

              return (
                <View key={day.date} style={[styles.calendarPreviewCell, { backgroundColor: bg, borderColor: colors.border }]}>
                  <Text style={{ color: day.state === 'empty' ? colors.textSecondary : '#fff', fontSize: 10, fontWeight: '700' }}>
                    {day.displayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
            {premiumProfile.isPremium ? t('Tap to open a larger calendar view and inspect your streak pattern.') : t('Tap to open the full view.')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Recent Notes')}</Text>
          {recentNotes.length === 0 ? (
            <Text style={[styles.emptyNotesText, { color: colors.textSecondary }]}>{t('Add a short note during check-in and it will show up here.')}</Text>
          ) : (
            recentNotes.map(note => (
              <View key={note.date} style={[styles.noteCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.noteDate, { color: colors.textSecondary }]}>{note.date}</Text>
                <Text style={[styles.noteText, { color: colors.text }]}>{note.note}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {renderHabitModal()}
      {renderColorModal()}
      {renderDeleteModal()}
      {renderCheckInModal()}
      {renderPaywallModal()}
      {renderCalendarModal()}
      {renderPlanModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  planButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  planButtonText: { fontSize: 14, fontWeight: '700' },
  iconButtonText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  hero: { alignItems: 'center', marginBottom: 18 },
  habitName: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  statusText: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  subtleText: { fontSize: 13, marginTop: 4 },
  swipeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circleButton: { width: '100%', height: '100%', borderRadius: 94, alignItems: 'center', justifyContent: 'center' },
  disabledCircle: { opacity: 0.55 },
  streakValue: { color: '#fff', fontSize: 56, fontWeight: '800' },
  streakLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 4 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { height: 8, borderRadius: 4 },
  swipeHint: { textAlign: 'center', fontSize: 12, marginBottom: 18 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  secondaryAction: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryActionText: { fontSize: 15, fontWeight: '600' },
  recoveryBadge: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  recoveryText: { fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  sectionCard: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekItem: { alignItems: 'center', gap: 8 },
  weekDot: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weekDotText: { fontSize: 12, fontWeight: '700' },
  weekState: { fontSize: 11 },
  inlineFootnote: { fontSize: 13 },
  emptyNotesText: { fontSize: 14, lineHeight: 20 },
  noteCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  noteDate: { fontSize: 12, marginBottom: 6 },
  noteText: { fontSize: 14, lineHeight: 20 },
  emptyScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  introCard: { width: '100%', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 32, borderWidth: 1, alignItems: 'center' },
  introLogo: { width: 96, height: 96, marginBottom: 14 },
  introTitle: { fontSize: 28, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  introSubtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  introSteps: { width: '100%', gap: 10, marginBottom: 18 },
  introStep: { fontSize: 15, lineHeight: 22 },
  softPaywallCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 18 },
  softPaywallTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  modalFill: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24 },
  modalCard: { width: 340, maxWidth: '100%', borderRadius: 24, padding: 24, marginTop: 18 },
  modalScrollCard: { width: 340, maxWidth: '100%', maxHeight: '90%', minHeight: 520, borderRadius: 24, overflow: 'hidden', marginTop: 18 },
  colorModalCard: { width: 340, maxWidth: '100%', maxHeight: '78%', borderRadius: 24, overflow: 'hidden', marginTop: 18 },
  modalScrollContent: { padding: 24 },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTopSpacer: { width: 38, height: 38 },
  modalCloseButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarCard: { width: 360, maxWidth: '100%', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 18, textAlign: 'center' },
  input: { borderBottomWidth: 2, fontSize: 16, paddingVertical: 10, width: '100%', marginBottom: 18 },
  noteInput: { borderWidth: 1, borderRadius: 16, minHeight: 110, padding: 14, textAlignVertical: 'top', marginBottom: 18 },
  colorPreview: { width: '100%', padding: 14, borderRadius: 14, backgroundColor: 'rgba(120,120,128,0.12)', marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorPreviewCircle: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  inlineLabel: { fontSize: 15, fontWeight: '500' },
  preferenceRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, marginBottom: 16 },
  formSectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  timeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  lockedStrip: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 },
  reorderRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  secondaryButton: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#fff', fontWeight: '600' },
  disabledButton: { opacity: 0.35 },
  primaryButton: { width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteTextButton: { marginTop: 16, alignItems: 'center' },
  deleteText: { color: '#FF3B30', fontSize: 15, fontWeight: '600' },
  cancelButton: { marginTop: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 14 },
  confirmText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  paywallMessage: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  paywallFeature: { fontSize: 14, lineHeight: 21, marginBottom: 3 },
  offerStack: { gap: 10, marginBottom: 14 },
  offerCard: { borderWidth: 1, borderRadius: 16, padding: 12 },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offerTitle: { fontSize: 15, fontWeight: '800' },
  offerBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  offerPrice: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  offerTrial: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  offerDetail: { fontSize: 13, lineHeight: 19 },
  planGroupTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  helperCopy: { fontSize: 13, lineHeight: 20 },
  customTimeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  customTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addTimeButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  moreColorsButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  moreColorsText: { fontSize: 14, fontWeight: '700' },
  expandedColorsSection: { marginBottom: 10 },
  calendarPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  calendarPreviewCell: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginBottom: 18 },
  colorOption: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  selectedColor: { borderColor: '#fff' },
  colorCheck: { color: '#fff', fontSize: 24, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  calendarCell: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
