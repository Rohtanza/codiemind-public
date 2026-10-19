const maxRetries = 3;
let attemptCount = 0;

function shouldRetry(statusCode: number): boolean {
  return statusCode >= 500 && attemptCount < maxRetries;
}

export function recordAttempt(): number {
  attemptCount += 1;
  return attemptCount;
}
