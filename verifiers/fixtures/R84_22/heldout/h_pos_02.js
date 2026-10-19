import { object, string, coerce } from "zod";

const bookingForm = object({
  guestName: string().min(2),
  checkIn: coerce.date(),
  nights: coerce.number().int().min(1).max(30),
});

export default {
  data: () => ({ guestName: "", checkIn: "", nights: 1, error: null }),
  methods: {
    submit() {
      const parsed = bookingForm.safeParse(this.$data);
      this.error = parsed.success ? null : parsed.error.issues[0].message;
      if (parsed.success) this.$emit("book", parsed.data);
    },
  },
};
