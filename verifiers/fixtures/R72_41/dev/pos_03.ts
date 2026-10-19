export class Toolbar {
  private count = 0;

  constructor(private readonly root: HTMLElement) {}

  renderHeader(title: string): void {
    this.root.innerHTML = `<h1>${title}</h1>`;
  }

  handleClick(): void {
    this.count += 1;
    this.renderHeader(`Clicked ${this.count} times`);
  }
}
