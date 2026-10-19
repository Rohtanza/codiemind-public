export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export async function safely<T>(task: () => Promise<T>): Promise<T | string> {
  try {
    return await task();
  } catch (error: unknown) {
    return toErrorMessage(error);
  }
}
