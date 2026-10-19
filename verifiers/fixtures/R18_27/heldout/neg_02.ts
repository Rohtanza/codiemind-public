import { defineComponent, h, ref } from 'vue'

const SearchBox = defineComponent({
  setup(_, { expose }) {
    const query = ref('')
    expose({ clear: () => (query.value = '') })
    return () => h('input', { value: query.value })
  },
})

export default defineComponent({
  setup() {
    const searchBoxInstance = ref<InstanceType<typeof SearchBox>>()
    const clearSearch = () => searchBoxInstance.value?.clear()
    return () => h('div', [h(SearchBox, { ref: searchBoxInstance }), h('button', { onClick: clearSearch }, 'x')])
  },
})
