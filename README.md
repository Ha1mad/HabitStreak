# HabitStreak

HabitStreak is a polished React Native habit tracker built with Expo Router. It focuses on simple daily check-ins, streak momentum, notes, reminders, premium themes, and a premium insights experience designed to feel calm and motivating.

## Highlights

- Habit creation, editing, deletion, color customization, and reordering
- Swipe between habits on the home screen
- Daily streak tracking with recovery saves
- Notes for each check-in
- Weekly rhythm summary and history previews
- Premium plan preview with free and premium feature breakdowns
- Local notification reminders with custom times
- Theme packs and app icon styles
- iOS widget scaffolding and preview support
- Onboarding flow for first-time users

## Tech Stack

- Expo
- React Native
- Expo Router
- TypeScript
- AsyncStorage for local persistence
- Expo Notifications for reminders
- Expo Widgets scaffolding for iOS widget support

## Project Structure

- `app/` - Expo Router screens, layouts, and app logic
- `app/lib/` - Habit, reminder, subscription, premium, and widget helpers
- `app/context/` - Theme provider and app-wide UI state
- `assets/` - App branding, splash, and icon assets
- `components/` - Shared UI components from the Expo template
- `widgets/` - Widget definitions and preview data
- `scripts/` - Brand asset generator and repo helper scripts

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npx expo start
```

3. Open the project in one of the supported targets:
- Expo Go for standard app testing
- iOS simulator or Android emulator for device-style testing
- a development build for native features like widgets

## Notes For Testing

- Local notifications work in Expo Go, but device settings like Focus and Do Not Disturb can suppress them.
- iOS widget testing requires a development build, not Expo Go.
- Premium is currently previewed in-app. Real App Store and Google Play billing should be connected later.

## Recommended First Commits

If you are turning this into a public GitHub portfolio repo, a clean commit history could look like this:

1. `chore: initialize HabitStreak app structure`
2. `feat: add habit tracking and streak persistence`
3. `feat: add reminders, notes, and habit history`
4. `feat: add insights, themes, and premium preview`
5. `feat: add branding, splash, and app icon system`
6. `docs: add portfolio README and repo hygiene`

## Secrets And Repo Hygiene

This project currently has no checked-in `.env` files or obvious API keys in the app code. Keep any future secrets out of version control and use environment variables or a managed secrets system for production services.

The repository now ignores common local and generated files such as:
- `node_modules/`
- `.expo/`
- `.expo-shared/`
- `.env*`
- native build outputs

## Publishing To GitHub

When Git is installed on your machine, the usual publish flow is:

```bash
git init
git add .
git commit -m "chore: prepare HabitStreak for GitHub"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

If you want a polished portfolio repo, add screenshots after your first build and include a short project description in the GitHub repo description field.
