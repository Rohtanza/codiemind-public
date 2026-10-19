export class MapView {
  private initialized = false;
  private layers: string[] = [];

  InitializeLayers(): void {
    if (this.initialized) return;
    this.layers = ["base", "roads"];
    this.initialized = true;
  }
}
