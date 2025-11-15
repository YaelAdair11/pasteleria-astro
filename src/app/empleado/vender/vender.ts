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

  mostrarModalConfirmacion = false;
  mostrarModalPago = false;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarProductos();

    this.supabaseService.suscribirCambiosProductos(async () => {
      await this.cargarProductos();
    });
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.getProductos(true);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  }

  agregarAlCarrito(producto: any) {
    const existe = this.carrito.find(p => p.id === producto.id);

    if (existe) {
      existe.cantidad++;
    } else {
      this.carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen ?? 'assets/no-image.png',
        cantidad: 1
      });
    }

    this.actualizarTotal();
  }

  aumentarCantidad(item: any) {
    item.cantidad++;
    this.actualizarTotal();
  }

  disminuirCantidad(item: any) {
    if (item.cantidad > 1) {
      item.cantidad--;
    } else {
      this.eliminarDelCarrito(item);
    }
    this.actualizarTotal();
  }

  eliminarDelCarrito(item: any) {
    this.carrito = this.carrito.filter((p) => p.id !== item.id);
    this.actualizarTotal();
  }

  actualizarTotal() {
    this.total = this.carrito.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );
  }

  finalizarCompra() {
    if (this.carrito.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    this.mostrarModalConfirmacion = true;
  }

  cerrarModal() {
    this.mostrarModalConfirmacion = false;
  }

  // ✅ Abre el modal de método de pago
  abrirModalPago() {
    this.mostrarModalConfirmacion = false;
    this.mostrarModalPago = true;
  }

  // ❌ Cierra solo el modal de pago
  cerrarPago() {
    this.mostrarModalPago = false;
  }

  pagar(metodo: string) {
    if (metodo === 'efectivo') {
      alert("Pago en efectivo realizado.");
    } else if (metodo === 'tarjeta') {
      alert("Pago con tarjeta realizado.");
    }

    // Limpia carrito
    this.carrito = [];
    this.total = 0;

    // Cierra modal de pago
    this.cerrarPago();
  }
}
