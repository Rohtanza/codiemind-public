import { defineComponent, shallowRef } from 'vue'
import VideoPlayer from './VideoPlayer.vue'

export default defineComponent({
  name: 'LessonView',
  setup() {
    const playerComponentRef = shallowRef<InstanceType<typeof VideoPlayer>>()

    const restart = () => {
      playerComponentRef.value?.seek(0)
      playerComponentRef.value?.play()
    }

    return () => (
      <div>
        <VideoPlayer ref={playerComponentRef} src="/lesson.mp4" />
        <button onClick={restart}>Restart</button>
      </div>
    )
  },
})
