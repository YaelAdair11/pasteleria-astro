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
  categorias: Categoria[] = [];
  carrito: any[] = [];
  ventas: any[] = [];
  ultimaVenta: any = null;


  usuario: any = null;

  filtroTexto: string = '';
  filtroCategoria: string = '';
  total = 0;

  mostrarModalConfirmacion = false;
  mostrarModalPago = false;
  mostrarModalTarjeta = false;
  mostrarModalTicket = false;
  mostrarModalReporte = false;
  mostrarVentas = false;

  fechaVenta = "";
  cliente = "";
  nombreTitularTarjeta = "";
  tipoPago = "";

  numeroTarjeta = "";
  vencimientoTarjeta = "";
  cvvTarjeta = "";

  mensajeCarritoVacio = false;
  loading = false;
  reporteSeleccionado: any = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    await this.cargarVentas();

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
  async cargarVentas() {
    const data = await this.supabaseService.getVentas();
    if (data) {
      this.ventas = data;
    } else {
      console.error("Error obteniendo ventas");
    }
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
    this.total = parseFloat(
      this.carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0).toFixed(2)
    );
  }

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

  // 👉 YA MODIFICADO PARA ACEPTAR CUALQUIER TARJETA Y FECHA MM/AA
  confirmarTarjeta() {
    const numeroLimpio = (this.numeroTarjeta || '').replace(/\s+/g, '');
    const venc = (this.vencimientoTarjeta || '').trim();
    const cvv = (this.cvvTarjeta || '').trim();
    const titular = (this.nombreTitularTarjeta || '').trim();

    // Número: permitir 8-19 dígitos (cualquier número)
    if (!/^\d{8,19}$/.test(numeroLimpio)) {
      alert('El número de tarjeta debe tener entre 8 y 19 dígitos.');
      return;
    }

    // Fecha MM/AA (2 dígitos + 2 dígitos)
    if (!/^(0[1-9]|1[0-2])\d{2}$/.test(venc)) {
      alert('Ingrese el vencimiento como MMYY (4 números). Ejemplo: 0527');
      return;
    }

    // CVV
    if (!/^\d{3,4}$/.test(cvv)) {
      alert('Ingrese un CVV válido (3 o 4 dígitos).');
      return;
    }

    if (!titular) {
      alert('Ingrese el nombre del titular.');
      return;
    }

    this.tipoPago = 'Tarjeta';
    this.mostrarModalTarjeta = false;
    this.procesarVentaExitosa();
  }

 async procesarVentaExitosa() {
  this.loading = true;
  this.mostrarModalPago = false;
  this.mostrarModalTarjeta = false;
  this.mostrarModalConfirmacion = false;

  try {
    this.fechaVenta = new Date().toLocaleString();
    if (!this.cliente?.trim()) this.cliente = 'Cliente General';

    const promesasDeVenta = this.carrito.map(item => {
      const totalCalculado = parseFloat((item.precio * item.cantidad).toFixed(2));
      const ventaData = {
        producto_id: item.id,
        cantidad: item.cantidad,
        total: totalCalculado,
        metodo_pago: this.tipoPago,
        usuario_id: this.usuario?.id
      };
      return this.supabaseService.registrarVentaConStock(ventaData);
    });

    await Promise.all(promesasDeVenta);

    // 🔥 NUEVO: GUARDAR ÚLTIMA VENTA PARA REIMPRESIÓN
    this.ultimaVenta = {
      fecha: this.fechaVenta,
      total: this.total,
      cliente: this.cliente,
      metodo: this.tipoPago,
      productos: JSON.parse(JSON.stringify(this.carrito)),
      usuario: this.usuario?.username || 'Cajero'
    };

    this.ventas.unshift({
      fecha: this.fechaVenta,
      total: this.total,
      cliente: this.cliente,
      metodo: this.tipoPago,
      productos: JSON.parse(JSON.stringify(this.carrito)),
    });

    this.mostrarModalTicket = true;

  } catch (error: any) {
    console.error('Error al procesar venta:', error);
    alert('❌ Error al procesar la venta: ' + (error?.message || error));
  } finally {
    this.loading = false;
  }
}

// 🔥 NUEVO MÉTODO - Agregar al final de la clase, antes del último }
reimprimirUltimoTicket() {
  if (!this.ultimaVenta) {
    alert('❌ No hay ventas recientes para reimprimir');
    return;
  }

  let ticketTexto = '--- REIMPRESIÓN - Ticket de Venta ---\n';
  ticketTexto += `Pastelería Dulce Arte\n`;
  ticketTexto += `Atendido por: ${this.ultimaVenta.usuario}\n`;
  ticketTexto += `Fecha: ${this.ultimaVenta.fecha}\n`;
  ticketTexto += `Cliente: ${this.ultimaVenta.cliente}\n`;
  ticketTexto += `Método: ${this.ultimaVenta.metodo}\n\n`;
  ticketTexto += 'Productos:\n';
  
  this.ultimaVenta.productos.forEach((item: any) => {
    ticketTexto += `${item.nombre} x${item.cantidad} $${(item.precio * item.cantidad).toFixed(2)}\n`;
  });
  
  ticketTexto += `\nTotal: $${this.ultimaVenta.total.toFixed(2)}\n`;
  ticketTexto += '¡Gracias por su compra!\n';

  // Crear y descargar archivo
  const blob = new Blob([ticketTexto], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket_reimpreso_${Date.now()}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  alert('✅ Ticket reimpreso correctamente');
}

  limpiarVenta() {
    this.carrito = [];
    this.total = 0;
    this.cliente = "";
    this.nombreTitularTarjeta = "";
    this.numeroTarjeta = "";
    this.vencimientoTarjeta = "";
    this.cvvTarjeta = "";
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
    if (!this.reporteSeleccionado) return;

    let texto = `--- Reporte de Venta ---\n`;
    texto += `Fecha: ${this.reporteSeleccionado.fecha}\n`;
    texto += `Cliente: ${this.reporteSeleccionado.cliente || 'N/A'}\n`;
    texto += `Metodo: ${this.reporteSeleccionado.metodo}\n\nProductos:\n`;
    (this.reporteSeleccionado.productos || []).forEach((p: any) => {
      texto += `${p.nombre} x${p.cantidad} - $${(p.precio * p.cantidad).toFixed(2)}\n`;
    });
    texto += `\nTotal: $${(this.reporteSeleccionado.total || 0).toFixed(2)}\n`;

    const blob = new Blob([texto], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_venta_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  cerrarModal() { this.mostrarModalConfirmacion = false; }
  cerrarPago() { this.mostrarModalPago = false; }
  cerrarTarjeta() {
    this.mostrarModalTarjeta = false;
    this.mostrarModalPago = true;
  }

  cerrarModalTicket(): void {
  this.mostrarModalTicket = false;
  this.limpiarVenta();
}

guardarTicket(): void {
  let ticketTexto = '--- Ticket de Venta ---\n';
  ticketTexto += `Pastelería Dulce Arte\n`;
  ticketTexto += `Atendido por: ${this.usuario?.username || 'Cajero'}\n`;
  ticketTexto += `Fecha: ${this.fechaVenta}\nCliente: ${this.cliente}\nMétodo: ${this.tipoPago}\n\nProductos:\n`;
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

}
