import { getIt } from "@/di/container";
import { FeatureFlags } from "@/core/FeatureFlags";

export const isBetaEnabled = (user: { id: string }): boolean =>
  getIt
    .get<FeatureFlags>(FeatureFlags)
    .isEnabled("beta", user.id);
