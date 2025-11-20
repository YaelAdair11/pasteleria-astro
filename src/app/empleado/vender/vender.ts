import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';   // ← IMPORTANTE
import { SupabaseService } from '../../services/supabase.service';
import { Categoria } from '../../models/categoria.model';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-vender',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vender.html',
  styleUrls: ['./vender.css']
})
export class Vender implements OnInit {

  productos: Producto[] = [];
  todosLosProductos: Producto[] = [];
  carrito: any[] = [];
  total = 0;
  categorias: Categoria[] = [];
  filtroTexto: string = '';
  filtroActivo: string = '';
  filtroCategoria: string = '';

  mostrarModalConfirmacion = false;
  mostrarModalPago = false;
  mostrarModalTarjeta = false;
  mostrarModalTicket = false;
  fechaVenta = new Date().toLocaleString();
  cliente = 'Cliente General';
  nombreTitularTarjeta = '';
  tipoPago = '';
  mostrarModalCarritoVacio = false;


  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarProductos();
    this.cargarCategorias();

    this.supabaseService.suscribirCambiosProductos(async () => {
      await this.cargarProductos();
    });
  }
  cerrarModalCarritoVacio() {
    this.mostrarModalCarritoVacio = false;
  }
  

  async cargarProductos() {
    const data = await this.supabaseService.getProductos(true);
    this.todosLosProductos = data;
    console.log('Productos cargados:', this.todosLosProductos);
    this.aplicarFiltros();
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
    this.carrito = this.carrito.filter(p => p.id !== item.id);
    this.actualizarTotal();
  }

  actualizarTotal() {
    this.total = this.carrito.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );
  }

  mensajeCarritoVacio: boolean = false;

finalizarCompra() {
  if (this.carrito.length === 0) {
    this.mensajeCarritoVacio = true;

    // El mensaje desaparecerá después de 2.5 segundos
    setTimeout(() => {
      this.mensajeCarritoVacio = false;
    }, 2500);

    return;
  }

  this.mostrarModalConfirmacion = true;
}

  cerrarModal() {
    this.mostrarModalConfirmacion = false;
  }

  abrirModalPago() {
    this.mostrarModalConfirmacion = false;
    this.mostrarModalPago = true;
  }

  async cargarCategorias() {
    this.categorias = await this.supabaseService.getCategorias();
    console.log('Categorías cargadas:', this.categorias);
  }

  cerrarPago() {
    this.mostrarModalPago = false;
  }

  filtrarCategoria(event: any) {
    const categoria = event.target.value;
    console.log('Categoría seleccionada para filtrar:', categoria);
    this.filtroCategoria = categoria;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let productosFiltrados = [...this.todosLosProductos];

    if (this.filtroTexto) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.nombre.toLowerCase().includes(this.filtroTexto)
      );
    }

    if (this.filtroCategoria) {
      console.log('Filtrando por categoría:', this.filtroCategoria);
      productosFiltrados = productosFiltrados.filter(p => 
        p.categoria.nombre === this.filtroCategoria
      );
    }

    if (this.filtroActivo === 'true') {
      productosFiltrados = productosFiltrados.filter(p => p.activo);
    } else if (this.filtroActivo === 'false') {
      productosFiltrados = productosFiltrados.filter(p => !p.activo);
    }

    this.productos = productosFiltrados;
  }

  cerrarTarjeta() {
    this.mostrarModalTarjeta = false;
    this.mostrarModalPago = true; 
  }

  confirmarTarjeta() {
    // Guardar como cliente el nombre del titular
    this.cliente = this.nombreTitularTarjeta || 'Cliente Tarjeta';
  
    this.mostrarModalTarjeta = false;
    this.mostrarModalTicket = true;
    this.fechaVenta = new Date().toLocaleString();
  }
  
  

  pagar(metodo: string) {
    this.tipoPago = metodo; // Guardar si fue tarjeta o efectivo
  
    if (metodo === 'efectivo') {
      this.cliente = 'Cliente General';
      this.mostrarModalPago = false;
      this.mostrarModalTicket = true;
      this.fechaVenta = new Date().toLocaleString();
      return;
    }
  
    if (metodo === 'tarjeta') {
      this.mostrarModalPago = false;
      this.mostrarModalTarjeta = true;
    }
  }
  cerrarModalTicket() {
    // Cerrar ticket
    this.mostrarModalTicket = false;
  
    // Limpiar carrito y total
    this.carrito = [];
    this.total = 0;
  
    // También aseguramos que se cierre cualquier modal abierto
    this.mostrarModalPago = false;
    this.mostrarModalTarjeta = false;
    this.mostrarModalConfirmacion = false;
  
    // Con esto ya tienes la pantalla limpia (panel de ventas)
  }
  

guardarTicket() {
  let ticketTexto = '--- Ticket de Venta ---\n';
  ticketTexto += `Fecha: ${this.fechaVenta}\n`;
  ticketTexto += `Cliente: ${this.cliente}\n\n`;
  ticketTexto += 'Productos:\n';

  this.carrito.forEach(item => {
    ticketTexto += `${item.nombre} x${item.cantidad}  $${(item.precio * item.cantidad).toFixed(2)}\n`;
  });

  ticketTexto += `\nTotal: $${this.total.toFixed(2)}\n`;
  ticketTexto += '\n¡Gracias por su compra!\n';

  const blob = new Blob([ticketTexto], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket_${Date.now()}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);

  // Después de guardar, limpia carrito y cierra modal
  this.carrito = [];
  this.total = 0;
  this.mostrarModalTicket = false;
}
imprimirTicket() {
  window.print();
}

}
