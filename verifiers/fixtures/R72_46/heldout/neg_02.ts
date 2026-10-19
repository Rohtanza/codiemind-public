export class Tooltip {
  private anchor: HTMLElement | null = null;

  attach(el: HTMLElement): void {
    this.anchor = el;
  }

  visible = (): boolean => this.anchor !== null && this.anchor.isConnected;
}
