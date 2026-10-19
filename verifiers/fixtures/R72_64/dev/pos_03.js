export class HttpRequestOptions {
  method = "GET";
  url = "";
  headers = {};
  body = null;
  timeout = 5000;
  retries = 0;
  credentials = "same-origin";
  cache = "default";
  redirect = "follow";

  withHeader(name, value) {
    this.headers = { ...this.headers, [name]: value };
    return this;
  }
}
