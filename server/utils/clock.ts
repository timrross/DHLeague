export function now(): Date {
  const override = process.env.TEST_NOW_ISO;
  if (override) {
    return new Date(override);
  }
  return new Date();
}
