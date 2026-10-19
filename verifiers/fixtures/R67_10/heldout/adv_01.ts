import { Spinner } from '@/components/Spinner';

export async function loadChart() {
  const mod = await import(
    /* webpackChunkName: "chart" */
    './charts/LineChart'
  );
  return { Chart: mod.LineChart, Fallback: Spinner };
}
