import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStorageService } from '../../services/session-storage/session-storage.service';
import { AuthService } from '../../services/auth/auth.service';
import { firstValueFrom } from 'rxjs';

export const logOutGuard: CanActivateFn = async (route, state) => {
  const sessionStorageService = inject(SessionStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    if (sessionStorageService.isV2AuthMode()) {
      await firstValueFrom(authService.logoutV2(true));
    } else {
      await firstValueFrom(authService.logout());
    }
  } catch (_) {}

  sessionStorageService.clearAll();
  router.navigate(['/auth/sign-in']);
  return false;
};
