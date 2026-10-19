interface Doc {
  ownerId: string;
  locked: boolean;
}

export class DocumentPolicy {
  constructor(private readonly userId: string) {}

  canEdit(doc: Doc): boolean {
    return !doc.locked && doc.ownerId === this.userId;
  }

  shouldNotify(doc: Doc): boolean {
    return doc.ownerId !== this.userId;
  }

  describe(doc: Doc): string {
    return `${doc.ownerId}${doc.locked ? " (locked)" : ""}`;
  }
}
