import React from 'react';
import { View, Text } from 'react-native';
import { ProgressCircle } from 'react-native-svg-charts';

export function GoalTimeShare({ trackedMinutes, goalMinutes }) {
  const share = Math.min(trackedMinutes / goalMinutes, 1);
  return (
    <View style={{ alignItems: 'center' }}>
      <ProgressCircle style={{ height: 120, width: 120 }} progress={share} progressColor="#10b981" />
      <Text>{Math.round(share * 100)}% of today's time goal</Text>
    </View>
  );
}
