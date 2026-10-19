import { Formik, Form, Field, ErrorMessage } from "formik";
import { z } from "zod";

const addressSchema = z.object({
  street: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  zip: z.string().regex(/^\d{5}$/, "5-digit ZIP"),
});

function validate(values: unknown) {
  const r = addressSchema.safeParse(values);
  if (r.success) return {};
  return Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
}

export const AddressForm = ({ onSave }: { onSave: (v: z.infer<typeof addressSchema>) => void }) => (
  <Formik initialValues={{ street: "", city: "", zip: "" }} validate={validate} onSubmit={onSave}>
    <Form>
      <Field name="street" /><ErrorMessage name="street" />
      <Field name="city" /><ErrorMessage name="city" />
      <Field name="zip" /><ErrorMessage name="zip" />
      <button type="submit">Save</button>
    </Form>
  </Formik>
);
