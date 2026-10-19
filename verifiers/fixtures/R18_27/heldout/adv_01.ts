import { ref } from 'vue'
import DatePicker from '@/components/DatePicker.vue'

type PickerInstance = InstanceType<typeof DatePicker>

export function useBookingDates() {
  const picker = ref<PickerInstance | null>(null)

  function openCalendar() {
    picker.value?.open()
  }

  return { picker, openCalendar }
}
