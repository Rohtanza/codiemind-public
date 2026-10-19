export class JsonParser {
  parse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch (e: unknown) {
      const msg = e instanceof SyntaxError ? e.message : String(e);
      console.error("Invalid JSON:", msg);
      return null;
    }
  }
}
