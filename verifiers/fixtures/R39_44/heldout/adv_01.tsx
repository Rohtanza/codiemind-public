import React from 'react';
import Kit = require('react-native-chart-kit');

const config = { backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', color: () => '#334155' };

export function CommuteTimeHeatmap({ days }: { days: { date: string; count: number }[] }) {
  return (
    <Kit.ContributionGraph
      values={days}
      endDate={new Date()}
      numDays={90}
      width={340}
      height={220}
      chartConfig={config}
      tooltipDataAttrs={() => ({})}
    />
  );
}
