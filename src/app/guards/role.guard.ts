import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const requiredRole = route.data['role'] as string;

    // ✅ obtienes el usuario almacenado (no hace llamadas)
    const user = await firstValueFrom(this.supabase.user$);

    // ✅ sin sesión
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // ✅ rol coincide → acceso inmediato
    if (user.rol === requiredRole) {
      return true;
    }

    // ✅ redirige si rol no coincide
    this.router.navigate(['/login']);
    return false;
  }
}
