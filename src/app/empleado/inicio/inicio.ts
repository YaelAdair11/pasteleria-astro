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

  // Pedidos
  pedidos: any[] = [];
  loadingPedidos: boolean = false;

  // Modales
  mostrarAgregar = false;
  mostrarPedidos = false;
  reporteSeleccionado: any = null;

  tiposProductos = ['Pastel', 'Bebida', 'Galletas', 'Postre'];
  
  // Objeto del formulario
  nuevoPedido: any = this.resetFormulario();

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarPedidos(); // Cargar pedidos al iniciar

    // Suscripciones Realtime
    this.supabaseService.suscribirCambiosVentas(() => this.cargarEstadisticas());
    
    // Suscribirse a nuevos pedidos (Opcional, si quieres que aparezcan solos)
    this.supabaseService.suscribirCambiosEmpleados(() => {
        // Usamos el canal genérico o creas uno específico para 'pedidos'
        this.cargarPedidos();
    });
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

  // --- PEDIDOS (CONECTADO A DB) ---
  async cargarPedidos() {
    this.loadingPedidos = true;
    try {
      const data = await this.supabaseService.getPedidosActivos();
      // Mapeamos para que la estructura coincida con tu HTML actual
      this.pedidos = data.map((p: any) => ({
        id: p.id,
        Tipo: p.tipo,
        nombre: p.cliente_nombre,
        telefono: p.cliente_telefono,
        fecha: p.fecha_entrega,
        lugar: p.lugar_entrega,
        estado: p.estado,
        ...p.detalles // Expandimos el JSON de detalles (kilos, sabor, etc.)
      }));
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      this.loadingPedidos = false;
    }
  }

  async guardarPedido() {
    try {
      await this.supabaseService.crearPedido(this.nuevoPedido);
      alert('✅ Pedido guardado exitosamente');
      this.cerrarModal();
      this.cargarPedidos(); // Recargar lista
    } catch (error: any) {
      alert('Error al guardar: ' + error.message);
    }
  }

  async cambiarEstadoPedido(pedido: any) {
    try {
      await this.supabaseService.actualizarEstadoPedido(pedido.id, pedido.estado);
      if (pedido.estado === 'entregado') {
        alert('Pedido marcado como entregado');
        this.cargarPedidos(); // Desaparecerá de la lista de pendientes
      }
    } catch (error: any) {
      alert('Error actualizando estado: ' + error.message);
    }
  }

  // --- UTILIDADES FORMULARIO ---
  resetFormulario() {
    return {
      Tipo: '', nombre: '', telefono: '', fecha: '', lugar: '',
      color: '', kilos: null, relleno: '', tematica: '',
      sabor: '', cantidad: null, tamano: '', tipoPostre: '',
      estado: 'en proceso'
    };
  }

  abrirModalAgregar() { 
    this.nuevoPedido = this.resetFormulario(); 
    this.mostrarAgregar = true; 
  }
  
  abrirModalPedidos() { 
    this.cargarPedidos(); // Recargar al abrir para asegurar datos frescos
    this.mostrarPedidos = true; 
  }

  cerrarModal() {
    this.mostrarAgregar = false;
    this.mostrarPedidos = false;
  }

  verReporte(pedido: any) { this.reporteSeleccionado = pedido; }
  cerrarReporte() { this.reporteSeleccionado = null; }
}