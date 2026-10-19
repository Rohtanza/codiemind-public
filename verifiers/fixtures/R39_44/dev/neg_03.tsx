import React from 'react';
import { View } from 'react-native';
import { BarChart } from 'react-native-svg-charts';
import { PieChart as KitPie } from 'react-native-chart-kit';

type Slice = { name: string; minutes: number; color: string };

export function FocusTimeOverview({ perDay, slices }: { perDay: number[]; slices: Slice[] }) {
  return (
    <View>
      <BarChart style={{ height: 160 }} data={perDay} svg={{ fill: '#0ea5e9' }} />
      <KitPie
        data={slices.map((s) => ({ name: s.name, population: s.minutes, color: s.color, legendFontColor: '#333', legendFontSize: 12 }))}
        width={320}
        height={180}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="12"
        chartConfig={{ color: () => '#000' }}
      />
    </View>
  );
}
