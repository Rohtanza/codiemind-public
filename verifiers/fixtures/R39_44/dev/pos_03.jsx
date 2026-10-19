import React from 'react';
import { View } from 'react-native';
import { AreaChart, XAxis, YAxis } from 'react-native-svg-charts';
import * as shape from 'd3-shape';

export default function SessionLengthDistribution({ buckets }) {
  const counts = buckets.map((b) => b.count);
  return (
    <View style={{ height: 240, flexDirection: 'row' }}>
      <YAxis data={counts} contentInset={{ top: 10, bottom: 10 }} />
      <View style={{ flex: 1 }}>
        <AreaChart style={{ flex: 1 }} data={counts} curve={shape.curveNatural} svg={{ fill: '#22c55e' }} />
        <XAxis data={buckets} formatLabel={(_, i) => buckets[i].label} />
      </View>
    </View>
  );
}
