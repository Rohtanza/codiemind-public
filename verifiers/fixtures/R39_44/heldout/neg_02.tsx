import React from 'react';
import { View } from 'react-native';
import { LineChart as GiftedLine } from 'react-native-gifted-charts';
import { YAxis } from 'react-native-svg-charts';

export function SleepTimeTrend({ hours }: { hours: number[] }) {
  return (
    <View style={{ flexDirection: 'row', height: 200 }}>
      <YAxis data={hours} contentInset={{ top: 10, bottom: 10 }} />
      <GiftedLine data={hours.map((h) => ({ value: h }))} areaChart curved />
    </View>
  );
}
