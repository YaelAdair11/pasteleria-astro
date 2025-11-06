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

  categorias = ["Pasteles", "Galletas", "Pan", "Postres"];

  buscar(event: any) {
    const texto = event.target.value.toLowerCase();
    // Aquí puedes filtrar productos
  }

  filtrarActivo(event: any) {
    const valor = event.target.value;
    // Filtrar por true, false o todos
  }

  filtrarCategoria(event: any) {
    const categoria = event.target.value;
    // Filtrar por categoría
  }

}
