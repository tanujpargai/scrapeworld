/**
 * Field Extractor for ICP Rule Engine
 * 
 * Safely extracts values from complex nested business objects,
 * supporting dot notation, array flattening, and computed aliases.
 */

export function getNestedProperty(obj: any, path: string): any {
  if (obj === null || obj === undefined || !path) {
    return undefined;
  }

  // Handle direct property match first (e.g. if key itself contains dots or is direct)
  if (path in obj && obj[path] !== undefined) {
    return obj[path];
  }

  // Handle computed convenience aliases
  const lowerPath = path.toLowerCase();
  if (lowerPath === 'haswebsite') {
    return Boolean(obj.verifiedWebsite || obj.website);
  }
  if (lowerPath === 'hasphone') {
    return Boolean(obj.phone);
  }
  if (lowerPath === 'hasemail') {
    return Boolean(obj.email);
  }
  if (lowerPath === 'hasowner') {
    return Boolean(obj.ownerName && (obj.ownerConfidence ?? 0) >= 50);
  }
  if (lowerPath === 'socialcount' || lowerPath === 'socialprofilescount') {
    return Array.isArray(obj.socialProfiles) ? obj.socialProfiles.length : 0;
  }
  if (lowerPath === 'opportunitiescount' || lowerPath === 'opportunitycount') {
    if (Array.isArray(obj.opportunities)) return obj.opportunities.length;
    if (Array.isArray(obj.opportunity?.opportunities)) return obj.opportunity.opportunities.length;
    return 0;
  }
  if (lowerPath === 'hasecommerceopportunity') {
    const opps = obj.opportunity?.opportunities || obj.opportunities;
    return Array.isArray(opps) ? opps.some((o: any) => o.category === 'ECOMMERCE') : false;
  }
  if (lowerPath === 'hasseoopportunity') {
    const opps = obj.opportunity?.opportunities || obj.opportunities;
    return Array.isArray(opps) ? opps.some((o: any) => o.category === 'TECHNICAL_SEO') : false;
  }
  if (lowerPath === 'haswebdevopportunity') {
    const opps = obj.opportunity?.opportunities || obj.opportunities;
    return Array.isArray(opps) ? opps.some((o: any) => o.category === 'WEBSITE_DEVELOPMENT') : false;
  }
  if (lowerPath === 'hasmarketingopportunity') {
    const opps = obj.opportunity?.opportunities || obj.opportunities;
    return Array.isArray(opps) ? opps.some((o: any) => o.category === 'DIGITAL_MARKETING') : false;
  }
  if (lowerPath === 'businessage' || lowerPath === 'age' || lowerPath === 'business age') {
    if (obj.businessAge !== undefined) return obj.businessAge;
    if (obj.age !== undefined) return obj.age;
    if (obj.yearsInBusiness !== undefined) return obj.yearsInBusiness;
    if (typeof obj.foundedYear === 'number' && obj.foundedYear > 1800) {
      return Math.max(0, new Date().getFullYear() - obj.foundedYear);
    }
    return undefined;
  }
  if (lowerPath === 'businessstatus' || lowerPath === 'status') {
    return obj.businessStatus ?? obj.status ?? obj.signals?.business?.status ?? undefined;
  }
  if (lowerPath === 'websitequality' || lowerPath === 'sitequality' || lowerPath === 'website quality') {
    return obj.websiteQuality ?? obj.websiteData?.overallScore ?? obj.websiteData?.performanceScore ?? undefined;
  }
  if (lowerPath === 'websitedata.overallscore' || lowerPath === 'websitedata.performancescore') {
    return obj.websiteData?.overallScore ?? obj.websiteData?.performanceScore ?? obj.websiteQuality ?? undefined;
  }
  if (lowerPath === 'websitedata.hasssl' || lowerPath === 'websitedata.sslenabled' || lowerPath === 'websitedata.ishttps') {
    return obj.websiteData?.sslEnabled ?? obj.websiteData?.hasSsl ?? obj.isHttps ?? obj.hasSsl ?? undefined;
  }
  if (lowerPath === 'websitedata.mobilescore' || lowerPath === 'websitedata.mobileresponsive') {
    return obj.websiteData?.mobileScore ?? (obj.mobileResponsive !== undefined ? (obj.mobileResponsive ? 80 : 30) : undefined);
  }

  // Phase 2: Domain Registration Intelligence Aliases
  if (lowerPath === 'domainage' || lowerPath === 'domainageyears' || lowerPath === 'domain_age' || lowerPath === 'domain.age') {
    return obj.domainData?.domainAgeYears ?? obj.signals?.website?.domainAgeYears ?? undefined;
  }
  if (lowerPath === 'domainregistrar' || lowerPath === 'registrar') {
    return obj.domainData?.registrar ?? undefined;
  }
  if (lowerPath === 'domainexpirationdays' || lowerPath === 'domaindaysuntilexpiration') {
    return obj.domainData?.daysUntilExpiration ?? undefined;
  }
  if (lowerPath === 'isregistered' || lowerPath === 'domainregistered') {
    return obj.domainData?.isRegistered ?? undefined;
  }

  // Phase 2: TLS Inspection Aliases
  if (lowerPath === 'tlsvalid' || lowerPath === 'istlsvalid' || lowerPath === 'certvalid' || lowerPath === 'tls_valid') {
    return obj.tlsData?.isValid ?? obj.signals?.website?.isTlsValid ?? undefined;
  }
  if (lowerPath === 'tlsissuer' || lowerPath === 'certissuer' || lowerPath === 'tls_issuer') {
    return obj.tlsData?.issuer ?? obj.signals?.website?.tlsIssuer ?? undefined;
  }
  if (lowerPath === 'tlsexpirationdays' || lowerPath === 'certdaysuntilexpiration') {
    return obj.tlsData?.daysUntilExpiration ?? undefined;
  }

  // Phase 2: Technical & Architecture Aliases
  if (lowerPath === 'isecommerce' || lowerPath === 'ecommerce' || lowerPath === 'is_ecommerce') {
    return obj.technicalData?.isEcommerce ?? obj.signals?.website?.isEcommerce ?? undefined;
  }
  if (lowerPath === 'ecommerceplatform' || lowerPath === 'ecommerce_platform') {
    return obj.technicalData?.ecommercePlatform ?? obj.signals?.website?.ecommercePlatform ?? undefined;
  }
  if (lowerPath === 'hasopengraph' || lowerPath === 'opengraph' || lowerPath === 'has_opengraph') {
    return obj.technicalData?.hasOpenGraph ?? obj.signals?.website?.hasOpenGraph ?? undefined;
  }
  if (lowerPath === 'hasschemaorg' || lowerPath === 'schemaorg' || lowerPath === 'structureddata' || lowerPath === 'has_schema_org') {
    return obj.technicalData?.hasSchemaOrg ?? obj.signals?.website?.hasSchemaOrg ?? undefined;
  }
  if (lowerPath === 'ttfb' || lowerPath === 'ttfbms' || lowerPath === 'responsetime' || lowerPath === 'responsetimems') {
    return obj.technicalData?.ttfbMs ?? obj.signals?.website?.ttfbMs ?? obj.websiteData?.loadTimeMs ?? undefined;
  }
  if (lowerPath === 'htmlsize' || lowerPath === 'htmlsizebytes') {
    return obj.technicalData?.htmlSizeBytes ?? obj.signals?.website?.htmlSizeBytes ?? undefined;
  }

  // Parse path segments (e.g., 'websiteData.performanceScore', 'socialProfiles.0.followers')
  const segments = path.split('.');
  let current: any = obj;

  for (let i = 0; i < segments.length; i++) {
    if (current === null || current === undefined) {
      return undefined;
    }

    const segment = segments[i];

    // If current is an array and segment is not an integer index,
    // map the remaining path over the array elements
    if (Array.isArray(current) && !/^\d+$/.test(segment)) {
      const remainingPath = segments.slice(i).join('.');
      const mapped = current
        .map((item) => getNestedProperty(item, remainingPath))
        .filter((val) => val !== undefined && val !== null);
      return mapped.length > 0 ? mapped : undefined;
    }

    current = current[segment];
  }

  return current;
}
