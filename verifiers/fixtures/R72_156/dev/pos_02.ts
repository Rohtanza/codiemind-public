interface User {
  id: string;
  name: string;
  email: string;
}

export function isUser(input: unknown): input is User {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  const record = input as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.email === "string"
  );
}
