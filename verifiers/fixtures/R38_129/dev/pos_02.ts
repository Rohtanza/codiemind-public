import { injectable, inject } from "tsyringe";
import type { HttpClient } from "@/net/HttpClient";

@injectable()
export class WeatherApi {
  constructor(@inject("HttpClient") private readonly http: HttpClient) {}

  current(city: string) {
    return this.http.get(`/weather?city=${encodeURIComponent(city)}`);
  }
}

@injectable()
export class WeatherCache {
  private readonly store = new Map<string, unknown>();
  constructor(private readonly api: WeatherApi) {}
}
