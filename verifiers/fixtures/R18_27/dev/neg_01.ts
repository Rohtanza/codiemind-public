import { ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

export function useSettingsModal() {
  const modalRef = ref<InstanceType<typeof BaseModal>>()

  function openSettings() {
    modalRef.value?.show()
  }

  function closeSettings() {
    modalRef.value?.hide()
  }

  return { modalRef, openSettings, closeSettings }
}
