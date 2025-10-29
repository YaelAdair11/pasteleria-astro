import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { Empleado } from './empleado/empleado';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'admin', component: Admin, canActivate: [RoleGuard], data: { role: 'admin' } },
  { path: 'empleado', component: Empleado, canActivate: [RoleGuard], data: { role: 'empleado' } },
  { path: '**', redirectTo: '/login' }
];
