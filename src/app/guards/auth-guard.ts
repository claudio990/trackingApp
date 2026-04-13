import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // If we are on the server, we allow the route. 
  // The client side will handle the actual auth check since localStorage is only there.
  if (isPlatformServer(platformId)) {
    return true;
  }

  if (authService.token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
