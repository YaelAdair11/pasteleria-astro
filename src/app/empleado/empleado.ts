import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';


@Component({
  selector: 'app-empleado',
  imports: [CommonModule, RouterModule],
  templateUrl: './empleado.html',
  styleUrls: ['./empleado.css',]
})

export class Empleado implements OnInit {
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
  ) { }

  ngOnInit(): void {
    this.cargarEstadoSidebar();
    this.actualizarTituloEIcono();
    this.supabase.user$.subscribe(user => {
      this.nombreUsuario = user?.username || user?.email || 'Usuario';
      this.rol = user?.rol || '';
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.actualizarTituloEIcono();
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

  actualizarTituloEIcono(): void {
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
