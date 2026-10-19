import { defineComponent, ref, computed } from 'vue';

export default defineComponent({
  name: 'CounterButton',
  props: { step: { type: Number, default: 1 } },
  setup(props) {
    const count = ref(0);
    const label = computed(() => `Clicked ${count.value} times`);
    const increment = () => {
      count.value += props.step;
    };
    return { count, label, increment };
  },
  template: `<button @click="increment">{{ label }}</button>`,
});
