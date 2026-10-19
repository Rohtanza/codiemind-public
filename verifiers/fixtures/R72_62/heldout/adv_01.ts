export class CodeGenerator {
  private readonly lines: string[] = [];

  emitSubclass(name: string, base: string): string {
    this.lines.push(`class ${name}
  extends ${base} {}`);
    const example = "class Admin extends User {}";
    return [example, ...this.lines].join("\n");
  }
}
