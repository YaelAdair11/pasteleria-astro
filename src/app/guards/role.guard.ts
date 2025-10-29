import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private supabase: SupabaseService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const requiredRole = route.data['role'] as string;

    const session = await this.supabase.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      this.router.navigate(['/']);
      return false;
    }

    const { data: perfil } = await this.supabase.getRolUsuario(userId);
    if (perfil?.rol === requiredRole) return true;

    this.router.navigate(['/']); // redirige si no coincide rol
    return false;
  }
}
