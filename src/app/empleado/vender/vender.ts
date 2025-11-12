import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-vender',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vender.html',
  styleUrls: ['./vender.css']
})
export class Vender implements OnInit {
  productos: any[] = [];
  carrito: any[] = [];
  total = 0;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarProductos();

    // 🔁 Escuchar cambios en tiempo real
    this.supabaseService.suscribirCambiosProductos(async () => {
      await this.cargarProductos();
    });
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.getProductos(true);
      console.log('📦 Productos recibidos desde Supabase:', this.productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  }
  
  

  agregarAlCarrito(producto: any) {
    const existente = this.carrito.find((p) => p.id === producto.id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.carrito.push({ ...producto, cantidad: 1 });
    }
    this.actualizarTotal();
  }

  actualizarTotal() {
    this.total = this.carrito.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );
  }

  // 🔽 ASEGÚRATE DE TENER ESTE MÉTODO DENTRO DE LA CLASE 🔽
  finalizarCompra() {
    alert(`Compra finalizada. Total a pagar: $${this.total}`);
    this.carrito = [];
    this.total = 0;
  }
}
