import isEmail from "validator/lib/isEmail";
import isMobilePhone from "validator/lib/isMobilePhone";

export interface CallbackRequest {
  email: string;
  phone: string;
}

export function validateCallbackForm(values: CallbackRequest): Partial<Record<keyof CallbackRequest, string>> {
  const errors: Partial<Record<keyof CallbackRequest, string>> = {};
  if (!isEmail(values.email)) errors.email = "Please enter a valid email";
  if (!isMobilePhone(values.phone, "any")) errors.phone = "Please enter a valid phone number";
  return errors;
}
