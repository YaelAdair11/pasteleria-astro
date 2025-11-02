import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {

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
