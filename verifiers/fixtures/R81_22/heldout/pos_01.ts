import { h, defineComponent, type PropType } from 'vue';

export const Badge = defineComponent({
  props: {
    tone: { type: String as PropType<'info' | 'warn'>, default: 'info' },
  },
  setup(props, { slots }) {
    return () => h('span', { class: `badge badge-${props.tone}` }, slots.default?.());
  },
});
