import React from 'react';
import { PieChart } from 'react-native-svg-charts';

interface CategoryTime { category: string; seconds: number; color: string }

export const TimeByCategory = ({ entries }: { entries: CategoryTime[] }) => {
  const data = entries.map((e) => ({
    key: e.category,
    value: e.seconds,
    svg: { fill: e.color },
  }));
  return <PieChart style={{ height: 200 }} data={data} innerRadius="45%" />;
};
