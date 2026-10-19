import { ref } from 'vue'
import LoginForm from '@/components/LoginForm.vue'

export function useLoginForm() {
  const formComponentRef = ref<InstanceType<typeof LoginForm>>()

  async function submit() {
    const valid = await formComponentRef.value?.validate()
    if (valid) {
      formComponentRef.value?.reset()
    }
  }

  return { formComponentRef, submit }
}
