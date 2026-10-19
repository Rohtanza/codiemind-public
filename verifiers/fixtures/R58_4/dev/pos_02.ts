export type RetryBehaviour = "none" | "linear" | "exponential";

export interface Organisation {
  id: string;
  displayName: string;
  retryBehaviour: RetryBehaviour;
}

/** Returns the organisation with its retry behaviour set to a safe default. */
export function withDefaultBehaviour(org: Organisation): Organisation {
  return { ...org, retryBehaviour: org.retryBehaviour ?? "linear" };
}
