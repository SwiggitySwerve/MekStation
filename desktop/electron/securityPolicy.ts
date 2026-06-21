export const CONTENT_SECURITY_POLICY_HEADER = 'Content-Security-Policy';

const COMMON_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' ws: wss: http://localhost:3600 http://127.0.0.1:3001",
] as const;

export function buildContentSecurityPolicy(developmentMode = false): string {
  const scriptDirectives = developmentMode
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  return [...COMMON_DIRECTIVES, scriptDirectives].join('; ');
}

export function buildSecurityHeaders(
  developmentMode = false,
): { key: string; value: string }[] {
  return [
    {
      key: CONTENT_SECURITY_POLICY_HEADER,
      value: buildContentSecurityPolicy(developmentMode),
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  ];
}
