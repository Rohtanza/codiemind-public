import React from 'react';
import { View } from 'react-native';
import { BarChart, Grid } from 'react-native-svg-charts';

type Props = { minutesPerHour: number[] };

export function HourlyTimeDistribution({ minutesPerHour }: Props) {
  return (
    <View style={{ height: 220, padding: 16 }}>
      <BarChart style={{ flex: 1 }} data={minutesPerHour} svg={{ fill: '#4f46e5' }} spacingInner={0.2}>
        <Grid />
      </BarChart>
    </View>
  );
}
