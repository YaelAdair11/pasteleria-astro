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

  // Datos
  productos: Producto[] = [];
  todosLosProductos: Producto[] = [];
  categorias: Categoria[] = [];
  carrito: any[] = [];
  ventas: any[] = [];
  
  // 👤 Empleado actual
  usuario: any = null;

  // Filtros y Totales
  filtroTexto: string = '';
  filtroCategoria: string = '';
  total = 0;

  // Modales
  mostrarModalConfirmacion = false;
  mostrarModalPago = false;
  mostrarModalTarjeta = false;
  mostrarModalTicket = false;
  mostrarModalReporte = false;
  mostrarVentas = false;

  // Datos de venta
  fechaVenta = "";
  cliente = "";
  nombreTitularTarjeta = "";
  tipoPago = "";
  
  // Estados de UI
  mensajeCarritoVacio = false;
  loading = false;
  reporteSeleccionado: any = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    
    // 1. Obtener el usuario logueado (el empleado)
    this.supabaseService.user$.subscribe(u => this.usuario = u);

    await this.cargarCategorias();
    await this.cargarProductos();
    this.loading = false;

    this.supabaseService.suscribirCambiosProductos(async () => {
      await this.cargarProductos();
    });
  }

  async cargarProductos() {
    const data = await this.supabaseService.getProductos(false); 
    this.todosLosProductos = data || [];
    this.aplicarFiltros();
  }

  async cargarCategorias() {
    this.categorias = await this.supabaseService.getCategorias() || [];
  }

  agregarAlCarrito(producto: Producto) {
    if (producto.stock <= 0) {
      alert('❌ Producto agotado');
      return;
    }

    const existe = this.carrito.find(p => p.id === producto.id);
    
    if (existe) {
      if (existe.cantidad >= producto.stock) {
        alert('⚠️ No hay más stock disponible de este producto');
        return;
      }
      existe.cantidad++;
    } else {
      this.carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen ?? 'assets/no-image.png',
        cantidad: 1,
        stockMaximo: producto.stock
      });
    }
    this.actualizarTotal();
  }

  aumentarCantidad(item: any) {
    if (item.cantidad < item.stockMaximo) {
      item.cantidad++;
      this.actualizarTotal();
    } else {
      alert('⚠️ Stock máximo alcanzado');
    }
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

  // --- PROCESO DE PAGO ---

  finalizarCompra() {
    if (this.carrito.length === 0) {
      this.mensajeCarritoVacio = true;
      setTimeout(() => this.mensajeCarritoVacio = false, 2500);
      return;
    }
    this.mostrarModalConfirmacion = true;
  }

  abrirModalPago() {
    this.mostrarModalConfirmacion = false;
    this.mostrarModalPago = true;
  }

  pagar(metodo: string) {
    this.tipoPago = metodo === 'efectivo' ? 'Efectivo' : 'Tarjeta';
    
    if (metodo === 'efectivo') {
      this.procesarVentaExitosa();
    } else {
      this.mostrarModalPago = false;
      this.mostrarModalTarjeta = true;
    }
  }

  confirmarTarjeta() {
    this.procesarVentaExitosa();
  }

  async procesarVentaExitosa() {
    this.loading = true;
    this.mostrarModalPago = false;
    this.mostrarModalTarjeta = false;
    
    try {
      this.fechaVenta = new Date().toLocaleString();
      if (!this.cliente.trim()) this.cliente = 'Cliente General';

      const promesasDeVenta = this.carrito.map(item => {
        // ✅ CORRECCIÓN: Asegurar 2 decimales en el total para evitar errores
        const totalCalculado = parseFloat((item.precio * item.cantidad).toFixed(2));

        const ventaData = {
          producto_id: item.id,
          cantidad: item.cantidad,
          total: totalCalculado, 
          metodo_pago: this.tipoPago,
          usuario_id: this.usuario?.id // Esto funcionará cuando ejecutes el SQL
        };
        return this.supabaseService.registrarVentaConStock(ventaData);
      });

      await Promise.all(promesasDeVenta);

      this.mostrarModalTicket = true;
      
      this.ventas.unshift({
        fecha: this.fechaVenta,
        total: this.total,
        cliente: this.cliente,
        metodo: this.tipoPago,
        productos: JSON.parse(JSON.stringify(this.carrito)),
      });

    } catch (error: any) {
      console.error('Error al procesar venta:', error);
      alert('❌ Error al procesar la venta: ' + error.message);
    } finally {
      this.loading = false;
    }
  }
  cerrarModalTicket() {
    this.mostrarModalTicket = false;
    this.limpiarVenta();
  }

  guardarTicket() {
    let ticketTexto = '--- Ticket de Venta ---\n';
    ticketTexto += `Pastelería Dulce Arte\n`;
    // Muestra el nombre del empleado en el ticket también
    ticketTexto += `Atendido por: ${this.usuario?.username || 'Cajero'}\n`;
    ticketTexto += `Fecha: ${this.fechaVenta}\nCliente: ${this.cliente}\nMetodo: ${this.tipoPago}\n\nProductos:\n`;
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

    this.cerrarModalTicket();
  }

  limpiarVenta() {
    this.carrito = [];
    this.total = 0;
    this.cliente = "";
    this.nombreTitularTarjeta = "";
    this.cargarProductos(); 
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
        p.categoria?.nombre === this.filtroCategoria
      );
    }
    this.productos = productosFiltrados;
  }

  toggleTodasVentas() {
    this.mostrarVentas = !this.mostrarVentas;
  }

  verReporte(indice: number) {
    this.reporteSeleccionado = this.ventas[indice];
    this.mostrarModalReporte = true;
  }

  cerrarReporte() {
    this.mostrarModalReporte = false;
    this.reporteSeleccionado = null;
  }
  
  descargarReporte() {
     // ... Lógica existente de reporte TXT
  }

  cerrarModal() { this.mostrarModalConfirmacion = false; }
  cerrarPago() { this.mostrarModalPago = false; }
  cerrarTarjeta() { this.mostrarModalTarjeta = false; this.mostrarModalPago = true; }
}