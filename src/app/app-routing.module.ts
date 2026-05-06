import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    children: [], // Necesario para que sea un nodo de ruta válido al usar solo canActivate
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
