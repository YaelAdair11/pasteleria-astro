import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { InicioComponent } from './admin/inicio/inicio';
import { InicioEmpleado } from './empleado/inicio/inicio';
import { Empleados } from './admin/empleados/empleados';
import { Empleado } from './empleado/empleado';
import { RoleGuard } from './guards/role.guard';
import { Inventario } from './admin/inventario/inventario';
import { Reportes } from './admin/reportes/reportes';
import { Ventas } from './admin/ventas/ventas';
import { Vender } from './empleado/vender/vender';
import { TiendaComponent } from './tienda/tienda.component';
import { ResetPassword } from './reset-password/reset-password';
import { UpdatePassword } from './update-password/update-password';
import { Buzon } from './admin/buzon/buzon';
import { Peticiones } from './empleado/peticiones/peticiones';


export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'tienda', component: TiendaComponent },
  { path: 'olvide-contrasena', component: ResetPassword },
  { path: 'actualizar-contrasena', component: UpdatePassword },
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
      { path: 'buzon', component: Buzon, data: { title: 'Buzón', icon: 'fa-inbox' } },
    ]
  },
  {
    path: 'empleado',
    component: Empleado,
    canMatch: [RoleGuard],
    data: { role: 'empleado' },
    children: [
      { path: '', component: InicioEmpleado, data: { title: 'Inicio', icon: 'fa-home' } },
      { path: 'vender', component: Vender, data: { title: 'Vender', icon: 'fa-cash-register' } },
      { path: 'peticiones', component: Peticiones, data: { title: 'Peticiones', icon: 'fa-clipboard-check' } },
    ]
  },
  { path: '**', redirectTo: '/login' }
];
