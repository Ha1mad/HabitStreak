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
    trial: 'Premium billing is coming soon',
    detail: 'This plan will be available once store billing is connected in a future release.',
  },
  {
    id: PREMIUM_YEARLY_PRODUCT_ID,
    title: 'Yearly',
    badge: 'Best value',
    price: '$29.99 / year',
    trial: 'Premium billing is coming soon',
    detail: 'Best fit once the store subscription flow is live.',
  },
] as const;

export function getSubscriptionSupportText() {
  return 'Premium billing will be added in a future release.';
}

export function getPremiumCtaLabel(_isPremium = false) {
  return 'Unlock Premium';
}

export function isExpoGoEnvironment() {
  return true;
}
