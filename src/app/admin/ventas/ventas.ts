import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service'; 
import { VentaConProducto } from '../../models/venta.model'; // ✅ NUEVO IMPORT

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas implements OnInit {
  filtro: string = '';
  ventas: any[] = []; // ✅ TEMPORAL: usar any para evitar errores
  loading: boolean = true;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.loadVentas();
  }

  async loadVentas(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const data = await this.supabaseService.getVentas(this.filtro);
      this.ventas = data;
    } catch (error: any) {
      console.error('Error al cargar ventas:', error);
      this.error = error.message || 'No se pudieron cargar las ventas.';
      this.ventas = [];
    }

    this.loading = false;
  }

  // ✅ AGREGA ESTA FUNCIÓN
  totalVentas(): number {
    return this.ventas.reduce((acc, v) => acc + v.total, 0);
  }
}
