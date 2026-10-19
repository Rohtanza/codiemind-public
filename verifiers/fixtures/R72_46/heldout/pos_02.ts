export const canAccess = function (level: number, required: number) {
  return level >= required;
};

export class Drawer {
  private openState = false;

  get isOpen(): boolean {
    return this.openState;
  }

  toggle(): void {
    this.openState = !this.openState;
  }
}
