// Helper function to make API calls with proper headers
export async function apiCall(url: string, options: RequestInit = {}) {
  // In production Whop environment, the x-whop-user-token header
  // is automatically added to all requests by Whop's infrastructure
  // For local development, the dev proxy handles this
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies/credentials
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
