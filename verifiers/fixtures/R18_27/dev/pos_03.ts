import { defineComponent, ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import UserList from './UserList.vue'

export default defineComponent({
  components: { ConfirmDialog, UserList },
  setup() {
    const dialogComponentRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
    const listComponentRef = ref<InstanceType<typeof UserList> | null>(null)

    async function removeSelected() {
      const ok = await dialogComponentRef.value?.open('Delete selected users?')
      if (ok) listComponentRef.value?.removeSelected()
    }

    return { dialogComponentRef, listComponentRef, removeSelected }
  },
})
