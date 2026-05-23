export const environment: any = {
  production: true,
  baseUrl: 'https://idp.bigso.org',
  useV2Auth: true,
  appId: 'sso-portal',
  tenantId: '6615ba1e-73ee-4c6c-a689-2a8359253988',
  /** Target app URL for direct (non-SDK) login. User is redirected here after authorize. */
  appRedirectUri: 'https://auth.bigso.org/auth/callback',
};

