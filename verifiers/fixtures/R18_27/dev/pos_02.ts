import { onMounted, useTemplateRef } from 'vue'
import DataTable from '@/components/DataTable.vue'

export function useTablePage() {
  const tableComponentRef = useTemplateRef<InstanceType<typeof DataTable>>('table')
  const searchInput = useTemplateRef<HTMLInputElement>('search')

  onMounted(() => {
    searchInput.value?.focus()
    tableComponentRef.value?.refresh()
  })

  return { tableComponentRef, searchInput }
}
