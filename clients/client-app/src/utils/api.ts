/**
 * Utility functions for API operations
 */

/**
 * Safely constructs an API URL by joining the base URL with a path
 * Uses the native URL constructor to handle trailing slashes and path joining
 * 
 * @param baseUrl - The base API URL (e.g., from VITE_API_URL)
 * @param path - The API path (e.g., '/api/v1/workspaces/123/products')
 * @returns A properly formatted URL string
 * 
 * @example
 * ```typescript
 * const apiUrl = buildApiUrl(import.meta.env.VITE_API_URL, '/api/v1/workspaces/123/products');
 * // Result: 'http://localhost:8000/api/v1/workspaces/123/products'
 * 
 * // Even if baseUrl has trailing slash:
 * const apiUrl = buildApiUrl('http://localhost:8000/', '/api/v1/workspaces/123/products');
 * // Result: 'http://localhost:8000/api/v1/workspaces/123/products'
 * ```
 */
export function buildApiUrl(baseUrl: string, path: string): string {
  // Ensure path starts with / for proper URL construction
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  try {
    return new URL(normalizedPath, baseUrl).toString();
  } catch (error) {
    console.error('Error constructing API URL:', error);
    // Fallback to string concatenation if URL constructor fails
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}${normalizedPath}`;
  }
}

/**
 * Gets the base API URL from environment variables with fallback
 * @returns The base API URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
}

/**
 * Constructs a complete API URL using the environment base URL
 * @param path - The API path
 * @returns A complete API URL
 */
export function apiUrl(path: string): string {
  return buildApiUrl(getApiBaseUrl(), path);
}