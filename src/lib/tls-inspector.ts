/**
 * Native Node.js TLS Certificate & Handshake Inspector
 * 
 * Provides evidence-backed TLS security analysis without external paid APIs.
 * Inspects certificate validity, issuer, expiration, and cipher suites
 * directly via socket connection with bounded timeout.
 * 
 * Important distinctions:
 * 1. An HTTPS URL does NOT prove its certificate is valid (e.g. expired, self-signed).
 * 2. A failed TLS inspection does NOT mean the website is completely offline (HTTP might work).
 * 3. Protected against SSRF: refuses to connect to private subnets, loopback, or metadata IPs.
 */

import * as tls from 'tls';
import { isSafePublicUrl } from './url-safety';

export interface TlsInspectionResult {
  httpsConfigured: boolean;
  isValid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiration: number | null;
  protocol: string | null;
  cipher: string | null;
  authorizationError: string | null;
  status: 'KNOWN' | 'UNKNOWN' | 'FAILED_TO_COLLECT';
  source: string;
  notes?: string;
}

/**
 * Normalizes host from domain or URL string.
 */
export function extractHostname(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  let clean = input.trim().toLowerCase();
  try {
    if (clean.includes('://')) {
      const parsed = new URL(clean);
      clean = parsed.hostname;
    } else if (clean.includes('/')) {
      clean = clean.split('/')[0];
    }
  } catch {
    // String processing fallback
  }
  clean = clean.split(':')[0].replace(/\.+$/, '');
  return clean || null;
}

/**
 * Inspects the TLS configuration of a target host via native Node.js TLS socket.
 * 
 * @param domainOrUrl - Domain name or URL to inspect
 * @param options - Configurable port (default 443), timeout (default 3500ms), and custom connector for tests
 */
export async function inspectTls(
  domainOrUrl: string,
  options: {
    port?: number;
    timeoutMs?: number;
    customInspector?: (host: string, port: number) => Promise<TlsInspectionResult>;
  } = {}
): Promise<TlsInspectionResult> {
  const host = extractHostname(domainOrUrl);
  if (!host) {
    return {
      httpsConfigured: false,
      isValid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysUntilExpiration: null,
      protocol: null,
      cipher: null,
      authorizationError: 'INVALID_HOST',
      status: 'UNKNOWN',
      source: 'TLS_INSPECTION',
      notes: 'Invalid hostname or empty domain provided',
    };
  }

  // SSRF Protection
  if (!isSafePublicUrl(`https://${host}`)) {
    return {
      httpsConfigured: false,
      isValid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysUntilExpiration: null,
      protocol: null,
      cipher: null,
      authorizationError: 'SSRF_BLOCKED',
      status: 'UNKNOWN',
      source: 'TLS_INSPECTION',
      notes: 'Connection rejected: Private, local, or cloud metadata destination',
    };
  }

  const port = options.port ?? 443;
  const timeoutMs = options.timeoutMs ?? 3500;

  if (options.customInspector) {
    return options.customInspector(host, port);
  }

  return new Promise<TlsInspectionResult>((resolve) => {
    let resolved = false;

    const finish = (result: TlsInspectionResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false, // Allow inspection of invalid/expired certs rather than dropping
        timeout: timeoutMs,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const authorized = socket.authorized;
          const authError = socket.authorizationError ? String(socket.authorizationError) : null;
          const protocol = socket.getProtocol();
          const cipherInfo = socket.getCipher();

          socket.end();

          if (!cert || Object.keys(cert).length === 0) {
            finish({
              httpsConfigured: true,
              isValid: false,
              issuer: null,
              subject: null,
              validFrom: null,
              validTo: null,
              daysUntilExpiration: null,
              protocol,
              cipher: cipherInfo?.name || null,
              authorizationError: authError || 'NO_CERTIFICATE_RETURNED',
              status: 'KNOWN',
              source: 'TLS_SOCKET_HANDSHAKE',
              notes: 'HTTPS port responded but did not return a peer certificate',
            });
            return;
          }

          const formatCertField = (field: any): string | null => {
            if (!field) return null;
            return Array.isArray(field) ? field.join(', ') : String(field).trim();
          };

          // Format Issuer name (prefer Organization or Common Name)
          let issuerStr: string | null = null;
          if (cert.issuer) {
            issuerStr = formatCertField(cert.issuer.O) || 
                        formatCertField(cert.issuer.CN) || 
                        formatCertField(cert.issuer.OU) || 
                        (typeof cert.issuer === 'string' ? cert.issuer : null);
          }

          // Format Subject name
          let subjectStr: string | null = null;
          if (cert.subject) {
            subjectStr = formatCertField(cert.subject.CN) || 
                         formatCertField(cert.subject.O) || 
                         null;
          }

          const validFrom = cert.valid_from ? new Date(cert.valid_from).toISOString() : null;
          const validTo = cert.valid_to ? new Date(cert.valid_to).toISOString() : null;

          let daysUntilExpiration: number | null = null;
          if (validTo) {
            const expMs = new Date(validTo).getTime() - Date.now();
            daysUntilExpiration = Math.round(expMs / (1000 * 60 * 60 * 24));
          }

          // Check for logical expiration if not flagged by socket
          const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
          const isValid = authorized && !isExpired;

          finish({
            httpsConfigured: true,
            isValid,
            issuer: issuerStr,
            subject: subjectStr,
            validFrom,
            validTo,
            daysUntilExpiration,
            protocol,
            cipher: cipherInfo?.name || null,
            authorizationError: !isValid ? (authError || (isExpired ? 'CERT_HAS_EXPIRED' : 'UNAUTHORIZED')) : null,
            status: 'KNOWN',
            source: 'TLS_SOCKET_HANDSHAKE',
            notes: isValid ? 'Valid TLS certificate' : `Certificate issue detected: ${authError || 'Expired certificate'}`,
          });
        } catch (e: any) {
          socket.destroy();
          finish({
            httpsConfigured: true,
            isValid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            validTo: null,
            daysUntilExpiration: null,
            protocol: null,
            cipher: null,
            authorizationError: e.message || 'HANDSHAKE_PARSE_FAILED',
            status: 'FAILED_TO_COLLECT',
            source: 'TLS_SOCKET_HANDSHAKE',
            notes: `Error reading peer certificate: ${e.message}`,
          });
        }
      }
    );

    socket.on('timeout', () => {
      socket.destroy();
      finish({
        httpsConfigured: false,
        isValid: false,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysUntilExpiration: null,
        protocol: null,
        cipher: null,
        authorizationError: 'ETIMEDOUT',
        status: 'FAILED_TO_COLLECT',
        source: 'TLS_SOCKET_HANDSHAKE',
        notes: `TLS connection timed out after ${timeoutMs}ms`,
      });
    });

    socket.on('error', (err: any) => {
      socket.destroy();
      const code = err.code || 'CONNECTION_FAILED';
      finish({
        httpsConfigured: false,
        isValid: false,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysUntilExpiration: null,
        protocol: null,
        cipher: null,
        authorizationError: code,
        status: code === 'ECONNREFUSED' ? 'KNOWN' : 'FAILED_TO_COLLECT',
        source: 'TLS_SOCKET_HANDSHAKE',
        notes: `TLS handshake error: ${err.message}`,
      });
    });
  });
}
