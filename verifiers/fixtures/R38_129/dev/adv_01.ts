import { injectable } from "tsyringe";
import { getIt as locator } from "@/di/container";
import { Mailer } from "@/core/Mailer";
import { Templates } from "@/core/Templates";

@injectable()
export class InviteService {
  constructor(private readonly mailer: Mailer) {}

  send(email: string) {
    const templates = locator.get<Templates>(Templates);
    return this.mailer.send(email, templates.render("invite"));
  }
}
