import { watch, useTemplateRef, type Ref } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue'

export function useEditorSync(source: Ref<string>) {
  const editor = useTemplateRef<InstanceType<typeof CodeEditor>>('editor')

  watch(source, (text) => {
    editor.value?.setContent(text)
  })

  return { editor }
}
