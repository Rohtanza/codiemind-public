import { onMounted, ref, shallowRef } from 'vue'
import { Chart } from 'chart.js'
import ChartLegend from '@/components/ChartLegend.vue'

export function useSalesChart() {
  const canvas = ref<HTMLCanvasElement | null>(null)
  const legendComponentRef = ref<InstanceType<typeof ChartLegend> | null>(null)
  const chartInstance = shallowRef<InstanceType<typeof Chart> | null>(null)

  onMounted(() => {
    if (!canvas.value) return
    chartInstance.value = new Chart(canvas.value, { type: 'bar', data: { datasets: [] } })
    legendComponentRef.value?.bind(chartInstance.value)
  })

  return { canvas, legendComponentRef, chartInstance }
}
