export const environment: any = {
  production: true,
  baseUrl: 'https://api-staging.bigso.cloud/idp',
  useV2Auth: true,
  appId: 'idp-web-client',
  tenantId: '6615ba1e-73ee-4c6c-a689-2a8359253988',
  /** Target app URL for direct (non-SDK) login. User is redirected here after authorize. */
  appRedirectUri: 'https://auth.bigso.cloud/auth/callback',
};

