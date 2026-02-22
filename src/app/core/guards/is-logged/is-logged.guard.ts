import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';

export const isLoggedGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    console.log('[isLoggedGuard] Checking session for url:', state.url);
    // Try to get profile with SSO cookie
    await firstValueFrom(authService.getProfile());
    console.log('[isLoggedGuard] Session valid, allowing access to:', state.url);
    return true;
  } catch (error) {
    console.log('[isLoggedGuard] Session invalid or expired, redirecting to login. Error:', error);
    console.log('[isLoggedGuard] Setting returnUrl:', state.url);
    // Cookie invalid or expired - redirect to login
    // Preserve the attempted URL for redirect after login
    router.navigate(['/auth/sign-in'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
};
