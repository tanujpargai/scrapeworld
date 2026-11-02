/**
 * URL Safety & SSRF Protection Utility
 * 
 * Validates external web addresses to prevent Server-Side Request Forgery (SSRF)
 * and access to private/internal networks or cloud metadata endpoints.
 * 
 * Protects against:
 * - Loopback addresses (127.0.0.1, localhost, ::1, 127.0.0.0/8).
 * - Cloud metadata services (169.254.169.254, metadata.google.internal).
 * - RFC 1918 Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
 * - RFC 4193 Unique Local IPv6 (fc00::/7, fd00::/8).
 * - RFC 4291 Link-Local IPv6 (fe80::/10).
 * - IPv4-mapped IPv6 addresses (::ffff:127.0.0.1, ::ffff:169.254.x.x, etc.).
 * - Non-HTTP/HTTPS protocols (file://, gopher://, dict://, ftp://).
 */

export function isSafePublicUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }

  const trimmed = urlString.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return false;
  }

  // Strictly enforce http or https protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  let hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames (e.g. "[::1]" -> "::1")
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  // 1. Block loopback and local domains
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0:0:0:0:0:0:0:1' ||
    hostname === 'metadata.google.internal'
  ) {
    return false;
  }

  // 2. Block 127.0.0.0/8 loopback range
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return false;
  }

  // 3. Block Cloud Metadata IP (e.g. AWS, GCP, Azure 169.254.169.254 / link-local)
  if (hostname.startsWith('169.254.')) {
    return false;
  }

  // 4. Block RFC 1918 Private IPv4 Ranges
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return false;
  }

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const rfc172Match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (rfc172Match) {
    const secondOctet = parseInt(rfc172Match[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return false;
    }
  }

  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return false;
  }

  // 5. Block IPv6 Link-Local (fe80::) and Unique Local (fc00::, fd00::)
  if (
    hostname.startsWith('fe80:') ||
    hostname.startsWith('fe8') ||
    hostname.startsWith('fe9') ||
    hostname.startsWith('fea') ||
    hostname.startsWith('feb') ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fd00:') ||
    hostname.startsWith('fd')
  ) {
    return false;
  }

  // 6. Block IPv4-mapped IPv6 addresses (::ffff:127.0.0.1, ::ffff:10.x, etc.)
  if (hostname.includes('::ffff:')) {
    const mappedIpv4 = hostname.split('::ffff:')[1];
    if (mappedIpv4 && !isSafePublicUrl(`http://${mappedIpv4}`)) {
      return false;
    }
  }

  // 7. Reject decimal or octal integer IP representations (e.g. 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    return false;
  }

  // Must have a valid domain structure with at least one dot or valid TLD
  if (!hostname.includes('.')) {
    return false;
  }

  return true;
}

/**
 * Normalizes URL and ensures safety. Returns null if unsafe.
 */
export function sanitizeExternalUrl(urlString: string): string | null {
  if (!isSafePublicUrl(urlString)) {
    return null;
  }

  const trimmed = urlString.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validates whether a redirect target URL is safe to follow.
 * 
 * @param currentUrl - The current URL making the redirect request
 * @param redirectLocation - Target 'Location' header value
 * @param currentRedirectCount - Current count of redirects in chain
 * @param maxRedirects - Maximum allowable redirects (default: 5)
 */
export function validateRedirectTarget(
  currentUrl: string,
  redirectLocation: string,
  currentRedirectCount = 0,
  maxRedirects = 5
): { isSafe: boolean; resolvedUrl: string | null; error?: string } {
  if (currentRedirectCount >= maxRedirects) {
    return {
      isSafe: false,
      resolvedUrl: null,
      error: `Redirect chain exceeded limit of ${maxRedirects} hops`,
    };
  }

  if (!redirectLocation || typeof redirectLocation !== 'string') {
    return { isSafe: false, resolvedUrl: null, error: 'Empty redirect location header' };
  }

  let resolved: string;
  try {
    resolved = new URL(redirectLocation, currentUrl).href;
  } catch {
    return { isSafe: false, resolvedUrl: null, error: `Malformed redirect URL: ${redirectLocation}` };
  }

  if (!isSafePublicUrl(resolved)) {
    return {
      isSafe: false,
      resolvedUrl: resolved,
      error: `SSRF Blocked: Redirect destination ${resolved} points to unsafe network`,
    };
  }

  return { isSafe: true, resolvedUrl: resolved };
}
