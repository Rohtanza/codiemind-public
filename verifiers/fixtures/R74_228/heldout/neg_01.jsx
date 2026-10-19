export function Logo({ dark }) {
  return dark ? (
    <img src="/logo-dark.svg" alt="Logo" />
  ) : (
    <img src="/logo-light.svg" alt="Logo" />
  );
}
