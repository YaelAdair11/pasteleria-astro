import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

interface Pedido {
  id: string;
  tipo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_entrega: string;
  lugar_entrega: string;
  estado: string;
  detalles: any;
  creado_en: string;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.css']
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  pedidosFiltrados: Pedido[] = [];
  loading = false;
  error: string | null = null;
  
  // Filtros
  filtroEstado = 'todos';
  filtroTipo = 'todos';
  searchTerm = '';

  // Estados disponibles
  estados = [
    { valor: 'pendiente', label: ' Pendiente', clase: 'bg-warning' },
    { valor: 'en proceso', label: ' En Proceso', clase: 'bg-info' },
    { valor: 'completado', label: ' Completado', clase: 'bg-success' },
    { valor: 'cancelado', label: ' Cancelado', clase: 'bg-danger' }
  ];

  constructor(private supabase: SupabaseService) {} // 

  async ngOnInit() {
    await this.cargarPedidos();
  }

  async cargarPedidos() {
    this.loading = true;
    this.error = null;
    
    try {
      this.pedidos = await this.supabase.getPedidos();
      this.filtrarPedidos();
    } catch (error: any) {
      this.error = 'Error al cargar los pedidos: ' + error.message;
    } finally {
      this.loading = false;
    }
  }

  filtrarPedidos() {
    this.pedidosFiltrados = this.pedidos.filter(pedido => {
      const coincideEstado = this.filtroEstado === 'todos' || pedido.estado === this.filtroEstado;
      const coincideTipo = this.filtroTipo === 'todos' || pedido.tipo === this.filtroTipo;
      const coincideBusqueda = !this.searchTerm || 
        pedido.cliente_nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        pedido.cliente_telefono.includes(this.searchTerm) ||
        pedido.detalles?.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return coincideEstado && coincideTipo && coincideBusqueda;
    });
  }

  async actualizarEstado(pedidoId: string, nuevoEstado: string) {
    try {
      await this.supabase.actualizarEstadoPedido(pedidoId, nuevoEstado);
      
      // Actualizar localmente
      const pedido = this.pedidos.find(p => p.id === pedidoId);
      if (pedido) {
        pedido.estado = nuevoEstado;
        this.filtrarPedidos();
      }
      
      this.mostrarNotificacion(`Estado actualizado a: ${nuevoEstado}`);
    } catch (error: any) {
      this.error = 'Error al actualizar estado: ' + error.message;
    }
  }

  getBadgeClase(estado: string): string {
    const estadoObj = this.estados.find(e => e.valor === estado);
    return estadoObj?.clase || 'bg-secondary';
  }

  getEstadoLabel(estado: string): string {
    const estadoObj = this.estados.find(e => e.valor === estado);
    return estadoObj?.label || estado;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  mostrarNotificacion(mensaje: string) {
    // Puedes implementar un toast notification aquí
    alert(mensaje); // Temporal - reemplaza con tu sistema de notificaciones
  }

  // Método para eliminar pedido (solo para admin/gerente)
  async eliminarPedido(pedidoId: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      try {
        await this.supabase.eliminarPedido(pedidoId);
        this.pedidos = this.pedidos.filter(p => p.id !== pedidoId);
        this.filtrarPedidos();
        this.mostrarNotificacion('Pedido eliminado correctamente');
      } catch (error: any) {
        this.error = 'Error al eliminar pedido: ' + error.message;
      }
    }
  }
}