import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { configureReminderNotifications } from './lib/reminders';

export default function RootLayout() {
  useEffect(() => {
    configureReminderNotifications().catch(error => console.log('Error configuring reminders', error));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
