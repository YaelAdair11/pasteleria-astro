import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {
  title = 'Inicio';
  icono = 'fa-home';

  nombreUsuario: string = '';
  rol: string = '';

  sidebarVisible: boolean = true; // controla si se muestra la sidebar

  private storageKey = 'sidebarVisibleState';

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargarEstadoSidebar();
    this.obtenerData();
    this.supabase.user$.subscribe(user => {
      this.nombreUsuario = user?.username || user?.email || 'Usuario';
      this.rol = user?.rol || '';
    });
  }

  cargarEstadoSidebar(): void {
    const savedState = localStorage.getItem(this.storageKey);
    // Si hay un valor guardado (no es null), lo usamos.
    // Si es null (primera visita), se queda el valor por defecto (true).
    if (savedState !== null) {
      this.sidebarVisible = (savedState === 'true'); // Convertimos el string "true" a boolean
    }
  }

  obtenerData() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let current = this.route;
        while (current.firstChild) { current = current.firstChild; }
        const data = current.snapshot.data;

        // Título
        if (data['title']) {
          this.title = data['title'];
        } else if (current.snapshot.routeConfig?.path === '') {
          this.title = 'Inicio';
        }

        // Icono
        if (data['icon']) {
          this.icono = data['icon'];
        } else if (current.snapshot.routeConfig?.path === '') {
          this.icono = 'fa-home';
        }
      });
  }

  alternarMenu() {
    this.sidebarVisible = !this.sidebarVisible;
    localStorage.setItem(this.storageKey, this.sidebarVisible.toString());
  }
  cerrarMenu() {
    this.sidebarVisible = false;
    localStorage.setItem(this.storageKey, 'false');
  }

  async logout() {
    await this.supabase.signOut();
    localStorage.removeItem(this.storageKey);
    this.router.navigate(['/login']);
  }
}
