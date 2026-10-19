import * as z from "yup";

const checkoutSchema = z.object({
  cardholder: z.string().required("Name on card is required"),
  cardNumber: z.string().matches(/^\d{16}$/, "16 digits").required(),
  cvc: z.string().length(3).required(),
});

export async function onCheckoutSubmit(form: HTMLFormElement) {
  const values = Object.fromEntries(new FormData(form));
  try {
    const order = await checkoutSchema.validate(values, { abortEarly: false });
    return { ok: true as const, order };
  } catch (err) {
    return { ok: false as const, errors: (err as z.ValidationError).errors };
  }
}
