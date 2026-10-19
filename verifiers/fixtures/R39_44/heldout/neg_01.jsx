import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function ResponseTimeBuckets({ buckets }) {
  return (
    <BarChart width={480} height={240} data={buckets}>
      <XAxis dataKey="range" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#8884d8" />
    </BarChart>
  );
}
