export class Point {
  constructor(public x: number, public y: number) {}
  length(): number { return Math.hypot(this.x, this.y); }
}

export class ReportJob {
  status = "pending";
  attempts = 0;
  startedAt?: Date;
  private lastError: string | null = null;

  constructor(
    public readonly id: string,
    public owner: string,
    private format: "pdf" | "csv",
    private pageSize: number,
    protected locale: string,
    readonly priority: number,
  ) {}

  run(): void { this.attempts++; }
}
