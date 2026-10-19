interface Config {
  port: number;
  debug: boolean;
}

const InitializeConfig = (): Config => ({
  port: Number(process.env.PORT ?? 3000),
  debug: process.env.DEBUG === "1",
});

export class App {
  private config: Config = InitializeConfig();
  private services: string[] = [];

  InitializeServices(): void {
    this.services.push("db", "cache");
  }

  start(): void {
    this.InitializeServices();
    console.log(`listening on ${this.config.port}`);
  }
}
