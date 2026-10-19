import { defineComponent, ref } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

export default defineComponent({
  components: { AppHeader, AppSidebar },
  setup() {
    const headerComponentRef = ref<InstanceType<typeof AppHeader> | null>(null)
    const sidebar = ref<InstanceType<typeof AppSidebar> | null>(null)

    function toggleLayout() {
      sidebar.value?.toggle()
      headerComponentRef.value?.recalculate()
    }

    return { headerComponentRef, sidebar, toggleLayout }
  },
})
