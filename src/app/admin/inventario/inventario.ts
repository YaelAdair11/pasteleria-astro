import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Producto } from '../../models/producto.model';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-inventario',
  imports: [CommonModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario {
  productos: Producto[] = [];
  
  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.productos = await this.supabase.getProductos(true);
  }
}
