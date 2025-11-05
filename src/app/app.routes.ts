import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { InicioComponent } from './admin/inicio/inicio';
import { Empleados } from './admin/empleados/empleados';
import { Empleado } from './empleado/empleado';
import { RoleGuard } from './guards/role.guard';
import { Inventario } from './admin/inventario/inventario';
import { Reportes } from './admin/reportes/reportes';
import { Ventas } from './admin/ventas/ventas';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'admin',
    component: Admin,
    canActivate: [RoleGuard],
    data: { role: 'admin' },
    children: [
      { path: '', component: InicioComponent },
      { path: 'empleados', component: Empleados },
      { path: 'inventario', component: Inventario },
      { path: 'reportes', component: Reportes },
      { path: 'ventas', component: Ventas },
    ]
  },

  { path: 'empleado', component: Empleado, canActivate: [RoleGuard], data: { role: 'empleado' } },
  { path: '**', redirectTo: '/login' }
];
