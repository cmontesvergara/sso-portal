import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { SessionStorageService } from '../../services/session-storage/session-storage.service';

export const isLoggedGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sessionStorageService = inject(SessionStorageService);

  try {
    console.log('[isLoggedGuard] Checking session for url:', state.url);

    if (sessionStorageService.isV2AuthMode()) {
      const token = sessionStorageService.getV2AccessToken();
      if (token) {
        console.log('[isLoggedGuard] V2 token found, allowing access');
        return true;
      }
    }

    await firstValueFrom(authService.getProfile());
    console.log('[isLoggedGuard] Session valid, allowing access to:', state.url);
    return true;
  } catch (error) {
    console.log('[isLoggedGuard] Session invalid or expired, redirecting to login. Error:', error);
    sessionStorageService.clearAll();
    router.navigate(['/auth/sign-in'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
};
