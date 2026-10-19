import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'TodoInput',
  emits: ['add'],
  setup(_props, { emit }) {
    const text = ref('');
    const submit = () => {
      emit('add', text.value);
      text.value = '';
    };
    return () => (
      <form onSubmit={submit}>
        <input v-model={text.value} />
        <button type="submit">Add</button>
      </form>
    );
  },
});
