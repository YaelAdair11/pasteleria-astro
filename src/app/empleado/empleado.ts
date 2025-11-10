import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-empleado',
  imports: [CommonModule, RouterModule],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css',
})

export class Empleado implements OnInit {

  nombreUsuario: string = '';
  rol: string = '';

  sidebarVisible: boolean = true; // controla si se muestra la sidebar

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit(): void {
    this.supabase.user$.subscribe(user => {
      this.nombreUsuario = user?.username || user?.email || 'Usuario';
      this.rol = user?.rol || '';
    });
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
