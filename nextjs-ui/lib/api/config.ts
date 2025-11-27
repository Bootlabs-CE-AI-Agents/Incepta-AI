/**
 * API Configuration
 *
 * Dynamically determines the API URL based on the current browser domain.
 * This allows the same build to work on both localhost and production domains.
 *
 * Domain mappings:
 * - localhost:3000 → localhost:8000 (local development)
 * - incepta.nullbytes.app → inceptaapi.nullbytes.app (production tunnel)
 *
 * Server-side uses API_URL env var (docker internal: http://api:8000)
 * Client-side uses dynamic URL based on browser domain
 */

/**
 * Production domain mapping
 * Maps frontend domains to their corresponding API domains
 */
const DOMAIN_API_MAP: Record<string, string> = {
  'incepta.nullbytes.app': 'https://inceptaapi.nullbytes.app',
  // Add more domain mappings as needed
};

/**
 * Get the API base URL dynamically based on the current environment
 *
 * @returns The API base URL to use for requests
 */
export function getApiBaseUrl(): string {
  // Server-side: use API_URL env var (docker internal network)
  if (typeof window === 'undefined') {
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  // Client-side: determine URL based on current browser domain
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;

  // Check if we're on a mapped production domain
  const fullHost = currentPort && currentPort !== '80' && currentPort !== '443'
    ? `${currentHost}:${currentPort}`
    : currentHost;

  if (DOMAIN_API_MAP[fullHost]) {
    return DOMAIN_API_MAP[fullHost];
  }

  if (DOMAIN_API_MAP[currentHost]) {
    return DOMAIN_API_MAP[currentHost];
  }

  // Default: localhost development
  // If on localhost:3000, use localhost:8000
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  // Fallback to env var or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Check if we're running on a production domain
 */
export function isProductionDomain(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production';
  }

  const currentHost = window.location.hostname;
  return Object.keys(DOMAIN_API_MAP).some(domain =>
    domain === currentHost || domain.endsWith(currentHost)
  );
}
