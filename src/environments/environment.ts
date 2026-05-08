// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.


export const environment: any = {
  production: false,
  baseUrl: 'https://sso.bigso.test',
  useV2Auth: true,
  appId: 'sso-portal',
  tenantId: '0593fd40-96ab-4547-95c2-43a1ffb6412a',
  /** Target app URL for direct (non-SDK) login. User is redirected here after authorize. */
  appRedirectUri: 'https://sso.bigso.test/auth/callback',
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
