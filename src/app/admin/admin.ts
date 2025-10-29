import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {

  nombreUsuario: string = '';
  sidebarVisible: boolean = true; // controla si se muestra la sidebar

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    try {
      this.nombreUsuario = await this.supabase.getNombreUsuario();
      if (!this.nombreUsuario) this.router.navigate(['/']);
    } catch (err) {
      console.error('Error obteniendo usuario:', err);
      this.router.navigate(['/']);
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/']);
  }
}
