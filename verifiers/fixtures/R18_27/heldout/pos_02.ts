import { defineComponent, h, ref } from 'vue'

const Counter = defineComponent({
  setup(_, { expose }) {
    const count = ref(0)
    expose({ reset: () => (count.value = 0) })
    return () => h('span', count.value)
  },
})

export default defineComponent({
  setup() {
    const counterComponentRef = ref<InstanceType<typeof Counter>>()
    return () =>
      h('div', [
        h(Counter, { ref: counterComponentRef }),
        h('button', { onClick: () => counterComponentRef.value?.reset() }, 'Reset'),
      ])
  },
})
