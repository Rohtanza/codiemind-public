class Validator {
  validate(value: string): boolean {
    return value.length > 0;
  }
}

class Formatter {
  format(value: string): string {
    return value.trim();
  }
}

export class EmailField
  extends Validator {
  private formatter = new Formatter();

  clean(value: string): string {
    return this.formatter.format(value).toLowerCase();
  }
}
