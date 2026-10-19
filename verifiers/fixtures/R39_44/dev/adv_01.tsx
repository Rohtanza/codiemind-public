import React from 'react';
import { LineChart, Grid } from 'react-native-svg-charts';
import { ChartConfig } from 'react-native-chart-kit/dist/HelperTypes';

const theme: Partial<ChartConfig> = { strokeWidth: 2, color: () => '#f97316' };

export function DailyActiveTime({ minutesByDay }: { minutesByDay: number[] }) {
  return (
    <LineChart
      style={{ height: 200 }}
      data={minutesByDay}
      svg={{ stroke: theme.color?.(1), strokeWidth: theme.strokeWidth }}
      contentInset={{ top: 16, bottom: 16 }}
    >
      <Grid />
    </LineChart>
  );
}
