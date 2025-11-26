import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service'; 
import { EstadoVentasService } from '../../services/estado-ventas.service';


@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas implements OnInit {
  // Filtros
  filtroNombre: string = '';
  vendedorSeleccionado: string = '';
  
  // Datos
  ventasOriginales: any[] = [];
  ventasFiltradas: any[] = [];
  vendedores: any[] = [];
  
  // Estados
  loading: boolean = true;
  error: string | null = null;

  // Estados para anulación
  anulandoVenta: boolean = false;
  ventaSeleccionadaParaAnular: any = null;
  motivoAnulacion: string = '';

  constructor(private supabaseService: SupabaseService,
    private estadoVentas: EstadoVentasService
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      const perfiles = await this.supabaseService.getPerfiles(); 
      this.vendedores = perfiles.filter((p: any) => p.rol === 'empleado' || p.rol === 'admin');
      await this.loadVentas();
    } catch (error: any) {
      console.error('Error inicializando:', error);
      this.error = error.message;
    }
    this.loading = false;
  }

  // 🔥 MANTÉN ESTE MÉTODO - es necesario para el botón "Actualizar"
  async loadVentas(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const data = await this.supabaseService.getVentas(''); 
      this.ventasOriginales = data;
      this.aplicarFiltros();
    } catch (error: any) {
      console.error('Error al cargar ventas:', error);
      this.error = error.message || 'No se pudieron cargar las ventas.';
      this.ventasOriginales = [];
      this.ventasFiltradas = [];
    }
    this.loading = false;
  }

  aplicarFiltros(): void {
    const hoy = new Date();
    const fechaHoyString = hoy.toDateString(); 

    this.ventasFiltradas = this.ventasOriginales.filter(venta => {
      const fechaVenta = new Date(venta.fecha);
      const esHoy = fechaVenta.toDateString() === fechaHoyString;
      
      // 🔥 EXCLUIR VENTAS ANULADAS
      if (!esHoy || venta.anulada === true) {
        return false;
      }

      if (this.vendedorSeleccionado) {
        if (!venta.usuario_id || venta.usuario_id !== this.vendedorSeleccionado) {
          return false;
        }
      }

      if (this.filtroNombre) {
        const nombreProducto = venta.productos?.nombre?.toLowerCase() || '';
        if (!nombreProducto.includes(this.filtroNombre.toLowerCase())) {
          return false;
        }
      }

      return true; 
    });
  }

  totalVentas(): number {
    return this.ventasFiltradas.reduce((acc, v) => acc + v.total, 0);
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.vendedorSeleccionado = '';
    this.aplicarFiltros();
  }

  // Métodos para anulación de ventas
  async anularVenta(venta: any): Promise<void> {
    try {
      const usuario = await this.supabaseService.getUsuarioActual();
      if (!usuario) {
        alert('❌ No se pudo verificar tu usuario. Intenta nuevamente.');
        return;
      }

      if (usuario.rol !== 'admin' && usuario.rol !== 'gerente') {
        alert('❌ Solo los gerentes y administradores pueden anular ventas.');
        return;
      }

      if (venta.anulada) {
        alert('⚠️ Esta venta ya fue anulada anteriormente.');
        return;
      }

      // Verificar antigüedad de la venta (máximo 7 días)
      const fechaVenta = new Date(venta.fecha);
      const hoy = new Date();
      const diferenciaDias = Math.floor((hoy.getTime() - fechaVenta.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diferenciaDias > 7) {
        alert('❌ Solo se pueden anular ventas de los últimos 7 días.');
        return;
      }

      this.ventaSeleccionadaParaAnular = venta;
      this.motivoAnulacion = '';

    } catch (error: any) {
      console.error('Error verificando permisos:', error);
      alert('❌ Error al verificar permisos: ' + error.message);
    }
  }

  async confirmarAnulacion(): Promise<void> {
  if (!this.ventaSeleccionadaParaAnular || !this.motivoAnulacion.trim()) {
    alert('❌ Debes ingresar un motivo para anular la venta.');
    return;
  }

  if (this.motivoAnulacion.trim().length < 10) {
    alert('❌ El motivo debe tener al menos 10 caracteres.');
    return;
  }

  const confirmacion = confirm(`¿Estás seguro de que deseas anular esta venta?\n\nProducto: ${this.ventaSeleccionadaParaAnular.productos?.nombre}\nTotal: $${this.ventaSeleccionadaParaAnular.total}\n\nEsta acción no se puede deshacer.`);
  
  if (!confirmacion) return;

  this.anulandoVenta = true;

  try {
    await this.supabaseService.anularVenta(
      this.ventaSeleccionadaParaAnular.id,
      this.motivoAnulacion.trim()
    );

    // 🔥 NOTIFICAR A TODOS LOS COMPONENTES
    this.estadoVentas.notificarActualizacionVentas();

    // Eliminar manualmente
    const ventaId = this.ventaSeleccionadaParaAnular.id;
    this.ventasOriginales = this.ventasOriginales.filter(v => v.id !== ventaId);
    this.ventasFiltradas = this.ventasFiltradas.filter(v => v.id !== ventaId);
    
    alert('✅ Venta anulada correctamente.');
    this.cancelarAnulacion();
    
  } catch (error: any) {
    console.error('Error anulando venta:', error);
    alert('❌ Error al anular la venta: ' + error.message);
  } finally {
    this.anulandoVenta = false;
  }
}

  cancelarAnulacion(): void {
    this.ventaSeleccionadaParaAnular = null;
    this.motivoAnulacion = '';
  }

  // Método para ver detalles de anulación si existe
  verDetallesAnulacion(venta: any): void {
    if (!venta.anulacion) return;
    
    const detalles = `
      🚫 VENTA ANULADA

      📅 Fecha de anulación: ${new Date(venta.anulacion.fecha_anulacion).toLocaleString()}
      👤 Anulada por: ${venta.anulacion.anulado_por?.username || 'N/A'}
      📝 Motivo: ${venta.anulacion.motivo}

      📋 Detalles originales:
      • Producto: ${venta.productos?.nombre}
      • Cantidad: ${venta.cantidad}
      • Total: $${venta.total}
      • Método: ${venta.metodo_pago}
    `;
    
    alert(detalles);
  }
}