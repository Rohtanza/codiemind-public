import { injectable } from "tsyringe";
import { UserRepository } from "@/data/UserRepository";
import { Logger } from "@/core/Logger";

@injectable()
export class UserService {
  constructor(
    private readonly repo: UserRepository,
    private readonly logger: Logger,
  ) {}

  async findUser(id: string) {
    this.logger.info(`Loading user ${id}`);
    return this.repo.byId(id);
  }
}
