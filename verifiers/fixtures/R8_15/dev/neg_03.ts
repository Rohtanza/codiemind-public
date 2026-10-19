import { TestSuite, Test, expect } from "testyts";
import { validateEmail } from "../src/validation";

@TestSuite()
export class EmailValidation {
  @Test()
  acceptsPlainAddress() {
    expect.toBeTrue(validateEmail("ada@example.com"));
  }

  @Test()
  rejectsMissingAt() {
    expect.toBeFalse(validateEmail("ada.example.com"));
  }
}
