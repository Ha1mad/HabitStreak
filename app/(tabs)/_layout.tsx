import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ColorValue, Platform, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

function TabIcon({
  focused,
  color,
  activeName,
  inactiveName,
}: {
  focused: boolean;
  color: ColorValue;
  activeName: keyof typeof Ionicons.glyphMap;
  inactiveName: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? 'rgba(76, 126, 243, 0.14)' : 'transparent',
      }}
    >
      <Ionicons name={focused ? activeName : inactiveName} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors?.tint || '#4C7EF3',
        tabBarInactiveTintColor: colors?.textSecondary || '#8e8e93',
        tabBarStyle: {
          backgroundColor: colors?.surface || (Platform.OS === 'ios' ? 'rgba(28, 28, 30, 0.95)' : '#1c1c1e'),
          borderTopWidth: 1,
          borderTopColor: colors?.border || 'rgba(255,255,255,0.1)',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} activeName="home" inactiveName="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} activeName="bar-chart" inactiveName="bar-chart-outline" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} activeName="settings" inactiveName="settings-outline" />,
        }}
      />
    </Tabs>
  );
}
