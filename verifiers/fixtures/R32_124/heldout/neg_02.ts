type Plugin = { name: string; setup(): void };

export const bootstrap = {
  plugins: [] as Plugin[],
  InitializeLogger(): void {
    console.info("logger ready");
  },
  initPlugins(list: Plugin[]): void {
    this.plugins = list;
    list.forEach((p) => p.setup());
  },
};
