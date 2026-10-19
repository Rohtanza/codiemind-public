import React from 'react';
import * as SvgCharts from 'react-native-svg-charts';

const colors = ['#6366f1', '#22d3ee', '#f59e0b'];
const keys = ['coding', 'meetings', 'review'] as const;

type Day = { day: string; coding: number; meetings: number; review: number };

export const StackedWeekTime = ({ days }: { days: Day[] }) => (
  <SvgCharts.StackedBarChart
    style={{ height: 220 }}
    keys={keys as unknown as string[]}
    colors={colors}
    data={days}
    contentInset={{ top: 20, bottom: 20 }}
  />
);
