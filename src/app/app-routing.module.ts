import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterModule, Routes, RouterStateSnapshot } from '@angular/router';
import { isLoggedGuard } from './core/guards/is-logged/is-logged.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [
      (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        const router = inject(Router);
        const appId = route.queryParams['app_id'];
        const redirectUri = route.queryParams['redirect_uri'];

        console.log(`[RootGuard] Intercepting root. app_id=${appId}, redirect_uri=${redirectUri}`);

        if (appId && redirectUri) {
          console.log('[RootGuard] App-initiated flow detected. Redirecting to /dashboard/select-tenant');
          return router.createUrlTree(['/dashboard/select-tenant'], {
            queryParams: { app_id: appId, redirect_uri: redirectUri },
          });
        }

        console.log('[RootGuard] Normal flow detected. Redirecting to /dashboard');
        return router.createUrlTree(['/dashboard']);
      }
    ],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'dashboard',
    canActivateChild: [isLoggedGuard],
    loadChildren: () =>
      import('./modules/logged-layout/logged-layout.module').then(
        (m) => m.LoggedLayoutModule,
      ),
  },

  {
    path: 'errors',
    loadChildren: () =>
      import('./modules/error/error.module').then((m) => m.ErrorModule),
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
