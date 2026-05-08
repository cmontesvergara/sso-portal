export const environment: any = {
  production: true,
  baseUrl: 'https://sso-core-prod.bigso.co',
  useV2Auth: true,
  appId: 'sso-portal',
  tenantId: '6615ba1e-73ee-4c6c-a689-2a8359253988',
  /** Target app URL for direct (non-SDK) login. User is redirected here after authorize. */
  appRedirectUri: 'https://sso.bigso.co/auth/callback',
};

