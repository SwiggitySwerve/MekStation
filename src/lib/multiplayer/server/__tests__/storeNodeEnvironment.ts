/** Set the named test-only override without aliasing the environment object. */
export function setTestNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    unsetEnv('NODE_ENV');
    return;
  }
  // Next marks NODE_ENV readonly; assert only this member for test writes.
  (process.env.NODE_ENV as string | undefined) = value;
}

// A string index permits deletion of the readonly literal property. Keeping
// this private and its call literal also leaves the env name statically known.
function unsetEnv(name: string): void {
  delete process.env[name];
}
