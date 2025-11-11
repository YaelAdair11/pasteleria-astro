import { inject } from '@angular/core';
import { CanMatchFn, Router, Route, UrlSegment } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { firstValueFrom, filter } from 'rxjs';

export const RoleGuard: CanMatchFn = async (route: Route, segments: UrlSegment[]) => {
  
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  await firstValueFrom(
    supabase.ready$.pipe(filter(ready => ready === true))
  );

  const requiredRole = route.data?.['role'] as string || '';

  // Obtienes el usuario almacenado (no hace llamadas)
  const user = await firstValueFrom(supabase.user$);

  // Sin sesión
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Col coincide → acceso inmediato
  if (user.rol === requiredRole) {
    return true;
  }

  // Redirige si rol no coincide
  router.navigate(['/login']);
  return false;
}
