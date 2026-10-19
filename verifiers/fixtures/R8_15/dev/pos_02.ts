import { suite, test } from "@testdeck/mocha";
import assert from "node:assert";
import { UserRepository } from "../src/users";

class InMemoryStore {
  private rows = new Map<string, unknown>();
  get(id: string) { return this.rows.get(id); }
  set(id: string, row: unknown) { this.rows.set(id, row); }
}

@suite
export class TestUserRepository {
  private repo = new UserRepository(new InMemoryStore());

  @test
  async savesAndLoads() {
    await this.repo.save({ id: "u1", name: "Ada" });
    assert.equal((await this.repo.find("u1"))?.name, "Ada");
  }
}
