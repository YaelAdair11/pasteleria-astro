import { Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { InicioComponent } from './admin/inicio/inicio';
import { Inicio } from './empleado/inicio/inicio';
import { Empleados } from './admin/empleados/empleados';
import { Empleado } from './empleado/empleado';
import { RoleGuard } from './guards/role.guard';
import { Inventario } from './admin/inventario/inventario';
import { Reportes } from './admin/reportes/reportes';
import { Ventas } from './admin/ventas/ventas';
import { Vender } from './empleado/vender/vender';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'admin',
    component: Admin,
    canMatch: [RoleGuard],
    data: { role: 'admin' },
    children: [
      { path: '', component: InicioComponent, data: { title: 'Inicio', icon: 'fa-home' } },
      { path: 'empleados', component: Empleados, data: { title: 'Empleados', icon: 'fa-users' } },
      { path: 'inventario', component: Inventario, data: { title: 'Inventario', icon: 'fa-boxes-stacked' } },
      { path: 'reportes', component: Reportes, data: { title: 'Reportes', icon: 'fa-cart-shopping' } },
      { path: 'ventas', component: Ventas, data: { title: 'Ventas', icon: 'fa-chart-line' } },
    ]
  },
  {
    path: 'empleado',
    component: Empleado,
    canMatch: [RoleGuard],
    data: { role: 'empleado' },
    children: [
      { path: '', component: Inicio },
      { path: 'vender', component: Vender },
    ]
  },
  { path: '**', redirectTo: '/login' }
];


