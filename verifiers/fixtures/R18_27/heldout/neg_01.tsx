import { defineComponent, ref } from 'vue'
import VideoPlayer from './VideoPlayer.vue'

export default defineComponent({
  name: 'TrailerView',
  setup() {
    const player = ref<InstanceType<typeof VideoPlayer> | null>(null)

    return () => (
      <section>
        <VideoPlayer ref={player} src="/trailer.mp4" />
        <button onClick={() => player.value?.pause()}>Pause</button>
      </section>
    )
  },
})
