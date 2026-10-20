export function demoEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.ENABLE_DEMO !== "false";
}
