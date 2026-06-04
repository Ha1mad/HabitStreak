import Constants, { ExecutionEnvironment } from 'expo-constants';

export const PREMIUM_MONTHLY_PRODUCT_ID = 'habitstreak_premium_monthly';
export const PREMIUM_YEARLY_PRODUCT_ID = 'habitstreak_premium_yearly';
export const INSTALL_STARTED_AT_KEY = 'installStartedAt';
export const WELCOME_PROMO_WINDOW_DAYS = 7;

export const subscriptionOffers = [
  {
    id: PREMIUM_MONTHLY_PRODUCT_ID,
    title: 'Monthly',
    badge: 'Flexible',
    price: '$4.99 / month',
    trial: '3-day free trial for eligible new subscribers',
    detail: 'Good for trying the full HabitStreak system without committing long term.',
  },
  {
    id: PREMIUM_YEARLY_PRODUCT_ID,
    title: 'Yearly',
    badge: 'Best value',
    price: '$29.99 / year',
    trial: '3-day free trial for eligible new subscribers',
    detail: 'Best fit if you want HabitStreak to become part of your long-term routine.',
  },
] as const;

export function isExpoGoEnvironment() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getPremiumCtaLabel(isPremium: boolean) {
  if (isPremium) {
    return 'Premium Active';
  }

  return isExpoGoEnvironment() ? 'Preview Premium on This Device' : 'Continue to Purchase';
}

export function getSubscriptionSupportText() {
  return isExpoGoEnvironment()
    ? 'You are in Expo Go, so Premium works in preview mode here. Real App Store / Google Play billing will be connected in your development build.'
    : 'Real store billing can be connected here when your subscription products are ready.';
}
