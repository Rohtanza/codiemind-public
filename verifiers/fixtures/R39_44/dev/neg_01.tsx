import React from 'react';
import { Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

export function WeeklyTimeDistribution({ hours }: { hours: number[] }) {
  return (
    <BarChart
      data={{ labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], datasets: [{ data: hours }] }}
      width={Dimensions.get('window').width - 32}
      height={220}
      yAxisLabel=""
      yAxisSuffix="h"
      chartConfig={{ color: () => '#4f46e5', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff' }}
    />
  );
}
