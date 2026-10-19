export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class Lookup {
  find(id: string): never {
    throw new NotFoundError(id);
  }
}
