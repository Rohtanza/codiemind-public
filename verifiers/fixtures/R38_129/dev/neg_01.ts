import { getIt } from "@/di/container";
import { UserRepository } from "@/data/UserRepository";

export class UserService {
  private readonly repo = getIt.get<UserRepository>(UserRepository);

  async findUser(id: string) {
    return this.repo.byId(id);
  }
}
