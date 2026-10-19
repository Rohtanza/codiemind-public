import React from 'react';
import { VictoryChart, VictoryHistogram, VictoryAxis } from 'victory-native';

type Props = { durationsMs: number[] };

export const TaskDurationHistogram = ({ durationsMs }: Props) => (
  <VictoryChart domainPadding={10}>
    <VictoryAxis label="minutes" />
    <VictoryAxis dependentAxis />
    <VictoryHistogram data={durationsMs.map((ms) => ({ x: ms / 60000 }))} bins={12} />
  </VictoryChart>
);
