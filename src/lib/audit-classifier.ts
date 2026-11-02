import { Severity } from '@prisma/client';

export type AuditFailureCategory =
  | 'WAF_PROTECTED'
  | 'DNS_FAILURE'
  | 'CONNECTION_TIMEOUT'
  | 'CONFIRMED_UNAVAILABLE'
  | 'HTTP_ERROR'
  | 'UNSAFE_DESTINATION'
  | 'INSPECTION_FAILED';

export interface AuditFailureDetail {
  category: AuditFailureCategory;
  statusCode?: number;
  message: string;
  isBlockedByWaf: boolean;
  canRetry: boolean;
  issueTitle: string;
  issueType: string;
  severity: Severity;
  recommendation: string;
}

/**
 * Classifies website audit errors into distinct, actionable diagnostic categories.
 * Prevents treating WAF-protected or throttled sites as broken or nonexistent.
 */
export function classifyAuditError(err: any): AuditFailureDetail {
  const statusCode = err?.response?.status;
  const errCode = err?.code || '';
  const errMsg = (err?.message || '').toLowerCase();
  const resData = typeof err?.response?.data === 'string' ? err.response.data.toLowerCase() : '';
  const headers = err?.response?.headers || {};
  const serverHeader = String(headers['server'] || '').toLowerCase();

  // 1. SSRF / Unsafe Destination
  if (errMsg.includes('ssrf') || errMsg.includes('unsafe') || errMsg.includes('private network') || errMsg.includes('loopback')) {
    return {
      category: 'UNSAFE_DESTINATION',
      message: err?.message || 'Audit blocked: Target resolves to an unsafe or private network destination',
      isBlockedByWaf: false,
      canRetry: false,
      issueTitle: 'Unsafe Destination Blocked (SSRF)',
      issueType: 'Security Restriction',
      severity: Severity.CRITICAL,
      recommendation: 'Only public HTTP/HTTPS URLs with valid domain names can be audited.',
    };
  }

  // 2. WAF / Anti-Bot Protection (HTTP 403, 401, 429, Cloudflare challenge, Akamai, etc.)
  const isCloudflare = serverHeader.includes('cloudflare') || Boolean(headers['cf-ray']) || resData.includes('cloudflare') || resData.includes('attention required');
  const hasAntiBotHeader = Boolean(headers['x-akamai-transformed'] || headers['x-datadome'] || headers['cf-mitigated']);
  const hasChallengeText = resData.includes('access denied') || resData.includes('verify you are a human') ||
                           resData.includes('bot detection') || resData.includes('captcha') || resData.includes('just a moment');
  const isWafBlocked = statusCode === 403 || statusCode === 401 || statusCode === 429 || hasAntiBotHeader || hasChallengeText || isCloudflare;

  if (isWafBlocked && (statusCode === 403 || statusCode === 401 || statusCode === 429 || isCloudflare || hasChallengeText)) {
    return {
      category: 'WAF_PROTECTED',
      statusCode,
      message: `Website is active but automated inspection was restricted by WAF / Anti-Bot controls (HTTP ${statusCode || 'Challenge'}).`,
      isBlockedByWaf: true,
      canRetry: false,
      issueTitle: 'Automated Audit Restricted by WAF / Anti-Bot Protection',
      issueType: 'Audit Restricted (WAF Protected)',
      severity: Severity.LOW,
      recommendation: 'The website is online and protected by bot defense. Automated audit was halted gracefully without evasion. Review manually in browser if technical inspection is required.',
    };
  }

  // 3. DNS Resolution Failure
  if (errCode === 'ENOTFOUND' || errCode === 'EAI_AGAIN' || errMsg.includes('enotfound')) {
    return {
      category: 'DNS_FAILURE',
      message: `Domain name resolution failed: DNS records for this host could not be resolved.`,
      isBlockedByWaf: false,
      canRetry: true,
      issueTitle: 'Domain Name Resolution Failed',
      issueType: 'DNS Failure',
      severity: Severity.CRITICAL,
      recommendation: 'Verify domain registration and active DNS A/CNAME records with the domain registrar.',
    };
  }

  // 4. Connection Timeout
  if (errCode === 'ETIMEDOUT' || errCode === 'ECONNABORTED' || errMsg.includes('timeout')) {
    return {
      category: 'CONNECTION_TIMEOUT',
      message: `Connection timed out waiting for server response.`,
      isBlockedByWaf: false,
      canRetry: true,
      issueTitle: 'Connection Timed Out',
      issueType: 'Connection Timeout',
      severity: Severity.HIGH,
      recommendation: 'Check server health and responsiveness; the server did not respond within the allocated timeout window.',
    };
  }

  // 5. Confirmed Unavailable / Connection Refused
  if (errCode === 'ECONNREFUSED' || errCode === 'ECONNRESET' || errCode === 'EHOSTUNREACH' || errMsg.includes('econnrefused')) {
    return {
      category: 'CONFIRMED_UNAVAILABLE',
      message: `Connection was actively refused or reset by host (${errCode || 'ECONNREFUSED'}).`,
      isBlockedByWaf: false,
      canRetry: true,
      issueTitle: 'Website Unavailable / Connection Refused',
      issueType: 'Website Unavailable',
      severity: Severity.CRITICAL,
      recommendation: 'Check web server process status (Nginx/Apache/Node) and hosting infrastructure.',
    };
  }

  // 6. Explicit HTTP Status Errors (404, 500, 502, 503, 504, etc.)
  if (statusCode && statusCode >= 400) {
    const is404 = statusCode === 404;
    return {
      category: 'HTTP_ERROR',
      statusCode,
      message: `Server returned HTTP ${statusCode} error.`,
      isBlockedByWaf: false,
      canRetry: statusCode >= 500,
      issueTitle: `HTTP ${statusCode} ${is404 ? 'Not Found' : 'Server Error'}`,
      issueType: 'HTTP Error',
      severity: is404 ? Severity.HIGH : Severity.CRITICAL,
      recommendation: is404 ? 'Check if the URL path exists or has been relocated.' : 'Check web application backend error logs.',
    };
  }

  // 7. Generic / Non-HTML inspection failure
  return {
    category: 'INSPECTION_FAILED',
    message: err?.message || 'Inspection could not be completed',
    isBlockedByWaf: false,
    canRetry: false,
    issueTitle: 'Inspection Could Not Be Completed',
    issueType: 'Inspection Incomplete',
    severity: Severity.MEDIUM,
    recommendation: 'Check if the URL returns standard HTML content or requires client-side JavaScript execution.',
  };
}
