import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioEmpleado implements OnInit {
  
  // Estadísticas
  ventasHoy: number = 0;
  ingresosHoy: number = 0;
  loadingStats: boolean = true;

  // Mostrar listas
  mostrarEntregados: boolean = false;
  mostrarListos: boolean = false;
  
  // Pedidos
  pedidos: any[] = [];
  pedidosPendientes: any[] = [];
  pedidosListos: any[] = [];
  pedidosEntregados: any[] = [];
  loadingPedidos: boolean = false;

  // Modales
  mostrarAgregar = false;
  mostrarPedidos = false;
  reporteSeleccionado: any = null;

  tiposProductos = ['Pastel', 'Bebida', 'Galletas', 'Postre'];
  
  // Formulario
  nuevoPedido: any = this.resetFormulario();

  // 🌸 Alertas pastel
  alerta = {
    mostrar: false,
    tipo: '',
    mensaje: ''
  };

  mostrarAlerta(tipo: string, mensaje: string) {
    this.alerta = { mostrar: true, tipo, mensaje };
    setTimeout(() => this.alerta.mostrar = false, 3000);
  }

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarPedidos();

    this.supabaseService.suscribirCambiosVentas(() => this.cargarEstadisticas());
    this.supabaseService.suscribirCambiosEmpleados(() => this.cargarPedidos());
  }

  // --- ESTADÍSTICAS ---
  async cargarEstadisticas() {
    this.loadingStats = true;
    try {
      const hoy = new Date();
      const reporte = await this.supabaseService.getReportesPorDia(hoy);
      this.ventasHoy = reporte.totalVentas;
      this.ingresosHoy = reporte.totalIngresos;
    } catch (error) {
      console.error('Error stats:', error);
    } finally {
      this.loadingStats = false;
    }
  }

  // --- PEDIDOS ---
  async cargarPedidos() {
    this.loadingPedidos = true;

    try {
      // 🔥 CORREGIDO → Se usa getPedidos()
      const data = await this.supabaseService.getPedidos();

      this.pedidos = data.map((p: any) => ({
        id: p.id,
        Tipo: p.tipo ?? p.Tipo ?? '',
        nombre: p.cliente_nombre,
        telefono: p.cliente_telefono,
        fecha: p.fecha_entrega,
        lugar: p.lugar_entrega,
        estado: (p.estado || '').toLowerCase(),
        ...p.detalles
      }));

      // Clasificación
      this.pedidosPendientes = this.pedidos.filter(p => 
        p.estado === 'pendiente' || p.estado === 'en proceso'
      );

      this.pedidosListos = this.pedidos.filter(p =>
        p.estado === 'listo'
      );

      this.pedidosEntregados = this.pedidos.filter(p => 
        p.estado === 'entregado'
      );

    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      this.loadingPedidos = false;
    }
  }

  // Crear pedido
  async guardarPedido() {
    try {
      await this.supabaseService.crearPedido(this.nuevoPedido);
      this.mostrarAlerta("success", "Pedido guardado exitosamente");
      this.cerrarModal();
      this.cargarPedidos();
    } catch (error: any) {
      this.mostrarAlerta("error", "Error al guardar: " + error.message);
    }
  }

  // Cambiar estado pedido
  async cambiarEstadoPedido(pedido: any) {
    try {
      await this.supabaseService.actualizarEstadoPedido(pedido.id, pedido.estado);
      this.cargarPedidos();
    } catch (error: any) {
      this.mostrarAlerta("error", "Error actualizando estado");
    }
  }

  // Marcar como entregado
  async entregarPedido(pedido: any) {
    try {
      await this.supabaseService.actualizarEstadoPedido(pedido.id, 'entregado');
      pedido.estado = 'entregado';
      this.cargarPedidos();
    } catch (error) {
      console.error("Error entregando pedido:", error);
    }
  }

  toggleEntregados() { this.mostrarEntregados = !this.mostrarEntregados; }
  toggleListos() { this.mostrarListos = !this.mostrarListos; }

  // Cancelar pedido
  async cancelarPedido(pedido: any) {
    const confirmar = confirm(`¿Seguro que deseas cancelar el pedido de ${pedido.nombre}?`);
    if (!confirmar) return this.mostrarAlerta("warning", "Cancelación detenida");

    try {
      await this.supabaseService.eliminarPedido(pedido.id);
      this.mostrarAlerta("success", "Pedido cancelado correctamente");
      this.cargarPedidos();
    } catch (error) {
      this.mostrarAlerta("error", "Error al cancelar");
    }
  }

  // --- FORMULARIO ---
  resetFormulario() {
    return {
      Tipo: '',
      nombre: '',
      telefono: '',
      fecha: '',
      lugar: '',
      color: '',
      kilos: null,
      relleno: '',
      tematica: '',
      sabor: '',
      cantidad: null,
      tamano: '',
      tipoPostre: '',
      estado: 'pendiente'
    };
  }

  abrirModalAgregar() { this.nuevoPedido = this.resetFormulario(); this.mostrarAgregar = true; }
  abrirModalPedidos() { this.cargarPedidos(); this.mostrarPedidos = true; }
  cerrarModal() { this.mostrarAgregar = false; this.mostrarPedidos = false; }

  verReporte(pedido: any) { this.reporteSeleccionado = pedido; }
  cerrarReporte() { this.reporteSeleccionado = null; }
}
