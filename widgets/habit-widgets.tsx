import React from 'react';
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  lineLimit,
  multilineTextAlignment,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

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

type PlusWidgetHabit = {
  id: string;
  name: string;
  streak: number;
  color: string;
};

type PlusWidgetProps = {
  isPremium: boolean;
  hasHabits: boolean;
  title: string;
  statusLine: string;
  completionRate: number;
  totalCheckIns: number;
  weeklyConsistency: number;
  topHabits: PlusWidgetHabit[];
};

const COLORS = {
  cream: '#F6EFE4',
  navy: '#14213D',
  ink: '#0F172A',
  softInk: '#5B6475',
  white: '#FFFFFF',
  green: '#22C55E',
  amber: '#F59E0B',
  mist: '#E8EEF8',
};

function statusColor(statusLine: string) {
  if (statusLine.toLowerCase().includes('completed')) {
    return COLORS.green;
  }

  if (statusLine.toLowerCase().includes('save') || statusLine.toLowerCase().includes('protect')) {
    return COLORS.amber;
  }

  return COLORS.softInk;
}

const HabitQuickWidgetView = (props: QuickWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  if (!props.hasHabits) {
    if (environment.widgetFamily === 'accessoryInline') {
      return <Text>HabitStreak • Add your first habit</Text>;
    }

    return (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[
          padding({ all: environment.widgetFamily === 'systemMedium' ? 16 : 14 }),
          background(COLORS.cream, shapes.roundedRectangle({ cornerRadius: 22 })),
        ]}
      >
        <Image systemName="sparkles" size={18} color={COLORS.navy} />
        <Text modifiers={[font({ size: 18, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.navy)]}>HabitStreak</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(COLORS.softInk)]}>Add your first habit in the app to fill this widget.</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryInline') {
    return <Text>{props.inlineSummary}</Text>;
  }

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack
        spacing={12}
        modifiers={[
          padding({ all: 16 }),
          background(COLORS.cream, shapes.roundedRectangle({ cornerRadius: 24 })),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[
            padding({ all: 14 }),
            background(props.accentColor, shapes.roundedRectangle({ cornerRadius: 20 })),
          ]}
        >
          <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(COLORS.white)]}>Today</Text>
          <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.white)]}>{props.streak}</Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(COLORS.white)]}>day streak</Text>
        </VStack>
        <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
          <Text modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.navy), lineLimit(1)]}>{props.habitName}</Text>
          <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(statusColor(props.statusLine)), lineLimit(2)]}>{props.statusLine}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(COLORS.softInk), lineLimit(1)]}>{props.reminderLine}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(COLORS.softInk)]}>{props.totalHabits} habit{props.totalHabits === 1 ? '' : 's'}</Text>
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 16 }),
        background(COLORS.cream, shapes.roundedRectangle({ cornerRadius: 24 })),
      ]}
    >
      <HStack spacing={8}>
        <Image systemName="flame.fill" size={16} color={props.accentColor} />
        <Text modifiers={[font({ size: 13, weight: 'semibold', design: 'rounded' }), foregroundStyle(COLORS.navy)]}>HabitStreak</Text>
      </HStack>
      <Text modifiers={[font({ size: 18, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.navy), lineLimit(2)]}>{props.habitName}</Text>
      <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundStyle(props.accentColor)]}>{props.streak}</Text>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(statusColor(props.statusLine)), lineLimit(2)]}>{props.statusLine}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(COLORS.softInk), lineLimit(2)]}>{props.reminderLine}</Text>
    </VStack>
  );
};

const HabitPlusWidgetView = (props: PlusWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  if (!props.isPremium) {
    if (environment.widgetFamily === 'accessoryCircular') {
      return <Image systemName="star.circle" size={18} color={COLORS.amber} />;
    }

    if (environment.widgetFamily === 'accessoryRectangular') {
      return (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 12, weight: 'bold', design: 'rounded' })]}>HabitStreak+</Text>
          <Text modifiers={[font({ size: 11 }), lineLimit(2)]}>Premium unlocks advanced widgets.</Text>
        </VStack>
      );
    }

    return (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[
          padding({ all: 16 }),
          background(COLORS.navy, shapes.roundedRectangle({ cornerRadius: 26 })),
        ]}
      >
        <Image systemName="diamond.fill" size={18} color={COLORS.amber} />
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.white)]}>Premium Widget</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(COLORS.mist)]}>
          Free users keep the Quick View widget. Premium unlocks deeper stats and richer lock screen layouts.
        </Text>
      </VStack>
    );
  }

  if (!props.hasHabits) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 14 })]}>
        <Text modifiers={[font({ size: 16, weight: 'bold', design: 'rounded' })]}>HabitStreak+</Text>
        <Text modifiers={[font({ size: 12 })]}>Create a habit in the app to start using the premium widgets.</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 10, weight: 'semibold', design: 'rounded' })]}>Day</Text>
        <Text modifiers={[font({ size: 18, weight: 'bold', design: 'rounded' })]}>{props.topHabits[0]?.streak ?? 0}</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={3}>
        <Text modifiers={[font({ size: 12, weight: 'bold', design: 'rounded' }), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ size: 11 }), lineLimit(1)]}>{props.statusLine}</Text>
        <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>{props.weeklyConsistency}% this week</Text>
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={10}
      modifiers={[
        padding({ all: 18 }),
        background(COLORS.navy, shapes.roundedRectangle({ cornerRadius: 28 })),
      ]}
    >
      <HStack spacing={8}>
        <Image systemName="chart.bar.xaxis" size={16} color={COLORS.amber} />
        <Text modifiers={[font({ size: 13, weight: 'semibold', design: 'rounded' }), foregroundStyle(COLORS.white)]}>HabitStreak+</Text>
      </HStack>
      <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.white), lineLimit(1)]}>{props.title}</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(COLORS.mist), lineLimit(2)]}>{props.statusLine}</Text>
      <HStack spacing={18}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(COLORS.mist)]}>Completion</Text>
          <Text modifiers={[font({ size: 26, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.amber)]}>{props.completionRate}%</Text>
        </VStack>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(COLORS.mist)]}>Check-ins</Text>
          <Text modifiers={[font({ size: 26, weight: 'bold', design: 'rounded' }), foregroundStyle(COLORS.white)]}>{props.totalCheckIns}</Text>
        </VStack>
      </HStack>
      <VStack alignment="leading" spacing={5}>
        <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(COLORS.mist)]}>Top habits</Text>
        {props.topHabits.slice(0, 3).map(habit => (
          <HStack key={habit.id} spacing={8}>
            <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(habit.color)]}>●</Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(COLORS.white), lineLimit(1)]}>{habit.name}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(COLORS.amber)]}>{habit.streak}d</Text>
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
};

export const HabitQuickWidget = createWidget<QuickWidgetProps>('HabitQuickWidget', HabitQuickWidgetView);
export const HabitPlusWidget = createWidget<PlusWidgetProps>('HabitPlusWidget', HabitPlusWidgetView);
