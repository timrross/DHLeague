export type FeatureFlags = {
  JUNIOR_TEAM_ENABLED: boolean;
};

export let FEATURES: FeatureFlags = {
  JUNIOR_TEAM_ENABLED: process.env.FEATURE_JUNIOR_TEAM_ENABLED === "true",
};

export function setFeatureFlags(overrides: Partial<FeatureFlags>) {
  FEATURES = { ...FEATURES, ...overrides };
}
