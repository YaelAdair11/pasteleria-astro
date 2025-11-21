import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  ventas: any[] = [];
  reporteSeleccionado: any = null;
  total = 0;
  categorias: Categoria[] = [];
  filtroTexto: string = '';
  filtroActivo: string = '';
  filtroCategoria: string = '';

  mostrarModalConfirmacion = false;
  mostrarModalPago = false;
  mostrarVentas = false;
  mostrarModalReporte = false;
  mostrarModalTarjeta = false;
  mostrarModalTicket = false;

  fechaVenta = "";
  cliente = "";
  nombreTitularTarjeta = "";
  tipoPago = "";
  mensajeCarritoVacio = false;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarProductos();
    this.cargarCategorias();

    this.supabaseService.suscribirCambiosProductos(async () => {
      await this.cargarProductos();
    });
  }

  async cargarProductos() {
    const data = await this.supabaseService.getProductos(true);
    this.todosLosProductos = data;
    this.aplicarFiltros();
  }

  async cargarCategorias() {
    this.categorias = await this.supabaseService.getCategorias();
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
    this.total = this.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  }

  finalizarCompra() {
    if (this.carrito.length === 0) {
      this.mensajeCarritoVacio = true;
      setTimeout(() => this.mensajeCarritoVacio = false, 2500);
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

  cerrarPago() {
    this.mostrarModalPago = false;
  }

  filtrarCategoria(event: any) {
    this.filtroCategoria = event.target.value;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let productosFiltrados = [...this.todosLosProductos];

    if (this.filtroTexto) {
      productosFiltrados = productosFiltrados.filter(p =>
        p.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase())
      );
    }

    if (this.filtroCategoria) {
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

  pagar(metodo: string) {
    this.tipoPago = metodo;

    if (metodo === 'efectivo') {
      if (!this.cliente.trim()) {
        this.cliente = 'Cliente General';
      }
      this.mostrarModalPago = false;
      this.mostrarModalTicket = true;
      this.fechaVenta = new Date().toLocaleString();
      this.registrarVenta();
    }

    if (metodo === 'tarjeta') {
      this.mostrarModalPago = false;
      this.mostrarModalTarjeta = true;
    }
  }

  cerrarTarjeta() {
    this.mostrarModalTarjeta = false;
    this.mostrarModalPago = true;
  }

  confirmarTarjeta() {
    this.mostrarModalTarjeta = false;
    this.mostrarModalTicket = true;

    this.fechaVenta = new Date().toLocaleString();
    this.registrarVenta();
  }

  cerrarModalTicket() {
    this.mostrarModalTicket = false;
    this.carrito = [];
    this.total = 0;
  }

  guardarTicket() {
    let ticketTexto = '--- Ticket de Venta ---\n';
    ticketTexto += `Fecha: ${this.fechaVenta}\nCliente: ${this.cliente}\n\nProductos:\n`;
    this.carrito.forEach(item => {
      ticketTexto += `${item.nombre} x${item.cantidad} $${(item.precio * item.cantidad).toFixed(2)}\n`;
    });
    ticketTexto += `\nTotal: $${this.total.toFixed(2)}\n\n¡Gracias por su compra!\n`;

    const blob = new Blob([ticketTexto], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.carrito = [];
    this.total = 0;
    this.mostrarModalTicket = false;
  }

  registrarVenta() {
    this.ventas.push({
      fecha: this.fechaVenta,
      total: this.total,
      cliente: this.cliente,
      metodo: this.tipoPago,
      productos: JSON.parse(JSON.stringify(this.carrito)),
    });
  }

  verReporte(indice: number) {
    this.reporteSeleccionado = this.ventas[indice];
    this.mostrarModalReporte = true;
  }

  cerrarReporte() {
    this.mostrarModalReporte = false;
  }

  descargarReporte() {
    let texto = `--- Reporte de Venta ---\n\n`;
    texto += `Fecha: ${this.reporteSeleccionado.fecha}\n`;
    texto += `Cliente: ${this.reporteSeleccionado.cliente}\n`;
    texto += `Método de pago: ${this.reporteSeleccionado.metodo}\n\n`;
    texto += `Productos:\n`;

    this.reporteSeleccionado.productos.forEach((item: any) => {
      texto += `${item.nombre} x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}\n`;
    });

    texto += `\nTOTAL: $${this.reporteSeleccionado.total.toFixed(2)}\n\nPastelería Dulce Encanto 🍰\n`;

    const blob = new Blob([texto], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  toggleTodasVentas() {
    this.mostrarVentas = !this.mostrarVentas;
  }
}
