export class UploadService {
  constructor(client) {
    this.client = client;
  }

  async upload(file) {
    if (!file) throw new TypeError("file is required");
    if (file.size > 10_000_000) {
      throw new RangeError("file too large");
    }
    const res = await this.client.post("/upload", file);
    if (!res.ok) return null;
    return res.json();
  }
}
