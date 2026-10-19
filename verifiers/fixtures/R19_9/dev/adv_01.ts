// No `any` annotations anywhere in this module.
function logRequest(method, path) {
  console.log(`${method} ${path}`);
}

export function handleHealth(url: string): { status: string } {
  logRequest("GET", url);
  return { status: "ok" };
}
