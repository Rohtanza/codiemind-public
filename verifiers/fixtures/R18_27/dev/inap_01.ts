import { onMounted, ref } from 'vue'

export function useAutoFocus() {
  const inputRef = ref<HTMLInputElement | null>(null)
  const focusCount = ref(0)

  onMounted(() => {
    inputRef.value?.focus()
    focusCount.value++
  })

  return { inputRef, focusCount }
}
