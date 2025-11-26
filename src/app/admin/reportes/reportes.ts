import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { EstadoVentasService } from '../../services/estado-ventas.service';


interface ReporteData {
  totalIngresos: number;
  totalVentas: number;
  ticketPromedio: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class Reportes implements OnInit {
  fechaSeleccionada = new Date(); 
  
  reporte: ReporteData | null = null;
  detalleVentas: any[] = []; 
  private subscriptions: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Corte de caja
  mostrarModalCorte: boolean = false;
  observaciones: string = '';
  procesandoCorte: boolean = false;

  constructor(private supabaseService: SupabaseService,
    private estadoVentas: EstadoVentasService
  ) {}

  ngOnInit(): void {
    this.loadReporte(); 
    this.suscribirActualizacionesVentas();
  }

  async loadReporte(): Promise<void> {
  this.loading = true;
  this.error = null;

  try {
    const [resumen, listaVentas] = await Promise.all([
      this.supabaseService.getReportesPorDia(this.fechaSeleccionada),
      this.supabaseService.getVentasParaCorte(this.fechaSeleccionada) 
    ]);

    this.reporte = resumen;
    this.detalleVentas = listaVentas; 

    console.log('📋 Ventas en detalle:', listaVentas.length);

  } catch (error: any) {
    console.error('Error al cargar reporte:', error);
    this.error = 'No se pudo cargar el reporte. ' + error.message;
  }

  this.loading = false;
}

  cambiarDia(dias: number): void {
    const nuevaFecha = new Date(this.fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    if (nuevaFecha > new Date()) return; 
    this.fechaSeleccionada = nuevaFecha;
    this.loadReporte(); 
  }

  volverAHoy(): void {
    this.fechaSeleccionada = new Date();
    this.loadReporte();
  }

  esHoy(): boolean {
    const hoy = new Date();
    return this.fechaSeleccionada.getDate() === hoy.getDate() &&
           this.fechaSeleccionada.getMonth() === hoy.getMonth() &&
           this.fechaSeleccionada.getFullYear() === hoy.getFullYear();
  }

  imprimirReporte(): void {
    window.print();
  }

  // =================== CORTE DE CAJA ===================
  abrirModalCorte(): void {
    this.mostrarModalCorte = true;
  }

  cerrarModalCorte(): void {
  this.mostrarModalCorte = false;
  this.observaciones = '';
  this.procesandoCorte = false; 
}

async realizarCorte(): Promise<void> {
  if (!this.reporte) return;

  this.procesandoCorte = true;
  
  try {
    const ventasDelDia = await this.supabaseService.getVentasParaCorte(this.fechaSeleccionada);
    
    const totalEfectivo = this.getTotalEfectivo();
    const totalTarjeta = this.getTotalTarjeta();

    const corteData = {
      total_ventas: this.reporte.totalIngresos,
      total_efectivo: totalEfectivo,
      total_tarjeta: totalTarjeta,
      ventas_totales: this.reporte.totalVentas,
      observaciones: this.observaciones
    };

    await this.supabaseService.realizarCorteCaja(corteData);
    
    this.procesandoCorte = false;
    
    this.cerrarModalCorte();
    
    alert(`✅ Corte de caja guardado\n\nTotal: $${this.reporte.totalIngresos.toFixed(2)}\nEfectivo: $${totalEfectivo.toFixed(2)}\nTarjeta: $${totalTarjeta.toFixed(2)}`);
    
  } catch (error: any) {
    console.error('Error en corte de caja:', error);
    alert('❌ Error: ' + error.message);
    
    this.procesandoCorte = false;
  }
}

  getTotalEfectivo(): number {
    if (!this.detalleVentas) return 0;
    return this.detalleVentas
      .filter(v => v.metodo_pago === 'Efectivo')
      .reduce((sum, v) => sum + v.total, 0);
  }

  getTotalTarjeta(): number {
    if (!this.detalleVentas) return 0;
    return this.detalleVentas
      .filter(v => v.metodo_pago === 'Tarjeta')
      .reduce((sum, v) => sum + v.total, 0);
  }

  calcularPorcentaje(partial: number, total: number): string {
  if (!total || total === 0) return '0';
  return ((partial / total) * 100).toFixed(0);
}

imprimirCorteCaja(): void {
  const ventanaImpresion = window.open('', '_blank');
  if (!ventanaImpresion) return;

  // Asegurar valores
  const totalEfectivo = this.getTotalEfectivo() || 0;
  const totalTarjeta = this.getTotalTarjeta() || 0;
  const totalIngresos = this.reporte?.totalIngresos || 0;
  const totalVentas = this.reporte?.totalVentas || 0;
  const ticketPromedio = this.reporte?.ticketPromedio || 0;
  
  const porcentajeEfectivo = totalIngresos > 0 ? (totalEfectivo / totalIngresos) * 100 : 0;
  const porcentajeTarjeta = totalIngresos > 0 ? (totalTarjeta / totalIngresos) * 100 : 0;

  const contenidoImpresion = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Corte de Caja - ${this.fechaSeleccionada.toLocaleDateString()}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #2c5aa0; }
        .fecha { text-align: center; margin-bottom: 20px; color: #666; }
        .resumen { margin-bottom: 20px; }
        .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .resumen-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .resumen-item .valor { font-size: 18px; font-weight: bold; }
        .resumen-item .label { font-size: 12px; color: #666; }
        .metodos-pago { margin-bottom: 20px; }
        .metodo-item { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; border-bottom: 1px solid #eee; }
        .observaciones { margin-top: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CORTE DE CAJA</h1>
        <div class="fecha">
          <strong>Fecha:</strong> ${this.fechaSeleccionada.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-grid">
          <div class="resumen-item">
            <div class="valor">$${totalIngresos.toFixed(2)}</div>
            <div class="label">TOTAL VENTAS</div>
          </div>
          <div class="resumen-item">
            <div class="valor">${totalVentas}</div>
            <div class="label"># DE VENTAS</div>
          </div>
          <div class="resumen-item">
            <div class="valor">$${ticketPromedio.toFixed(2)}</div>
            <div class="label">TICKET PROMEDIO</div>
          </div>
        </div>
      </div>

      <div class="metodos-pago">
        <h3 style="border-bottom: 1px solid #333; padding-bottom: 5px;">MÉTODOS DE PAGO</h3>
        <div class="metodo-item">
          <span><strong>EFECTIVO:</strong></span>
          <span>$${totalEfectivo.toFixed(2)} (${porcentajeEfectivo.toFixed(0)}%)</span>
        </div>
        <div class="metodo-item">
          <span><strong>TARJETA:</strong></span>
          <span>$${totalTarjeta.toFixed(2)} (${porcentajeTarjeta.toFixed(0)}%)</span>
        </div>
      </div>

      ${this.observaciones ? `
      <div class="observaciones">
        <strong>OBSERVACIONES:</strong><br>
        ${this.observaciones}
      </div>
      ` : ''}

      <div class="total">
        TOTAL GENERAL: $${totalIngresos.toFixed(2)}
      </div>

      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cerrar</button>
      </div>
    </body>
    </html>
  `;

  ventanaImpresion.document.write(contenidoImpresion);
  ventanaImpresion.document.close();
}

imprimirReporteCompleto(): void {
  const ventanaImpresion = window.open('', '_blank');
  if (!ventanaImpresion) return;

  // Datos para el corte de caja
  const totalEfectivo = this.getTotalEfectivo() || 0;
  const totalTarjeta = this.getTotalTarjeta() || 0;
  const totalIngresos = this.reporte?.totalIngresos || 0;
  const totalVentas = this.reporte?.totalVentas || 0;
  const ticketPromedio = this.reporte?.ticketPromedio || 0;
  
  const porcentajeEfectivo = totalIngresos > 0 ? (totalEfectivo / totalIngresos) * 100 : 0;
  const porcentajeTarjeta = totalIngresos > 0 ? (totalTarjeta / totalIngresos) * 100 : 0;

  // Generar tabla de ventas
  let tablaVentas = '';
  if (this.detalleVentas && this.detalleVentas.length > 0) {
    tablaVentas = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Hora</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Producto</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">Método</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">Cant.</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #dee2e6;">P. Unit</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #dee2e6;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${this.detalleVentas.map(venta => `
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${venta.productos?.nombre || 'N/A'}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">${venta.metodo_pago}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #dee2e6;">${venta.cantidad}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #dee2e6;">$${(venta.productos?.precio || 0).toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #dee2e6;">$${venta.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #f8f9fa; font-weight: bold;">
            <td colspan="5" style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">TOTAL DEL DÍA:</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6; color: #28a745;">$${totalIngresos.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  } else {
    tablaVentas = '<p style="text-align: center; color: #666; margin: 20px 0;">No hay ventas para esta fecha</p>';
  }

  const contenidoImpresion = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte Completo - ${this.fechaSeleccionada.toLocaleDateString()}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #2c5aa0; }
        .fecha { text-align: center; margin-bottom: 20px; color: #666; }
        .seccion { margin-bottom: 25px; }
        .seccion h2 { border-bottom: 1px solid #333; padding-bottom: 5px; color: #2c5aa0; }
        .resumen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .resumen-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .resumen-item .valor { font-size: 18px; font-weight: bold; }
        .resumen-item .label { font-size: 12px; color: #666; }
        .metodo-item { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px; border-bottom: 1px solid #eee; }
        .total-general { font-size: 16px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; border: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REPORTE COMPLETO</h1>
        <div class="fecha">
          <strong>Fecha:</strong> ${this.fechaSeleccionada.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <!-- Sección: Resumen del Día -->
      <div class="seccion">
        <h2>RESUMEN DEL DÍA</h2>
        <div class="resumen-grid">
          <div class="resumen-item">
            <div class="valor">$${totalIngresos.toFixed(2)}</div>
            <div class="label">TOTAL VENTAS</div>
          </div>
          <div class="resumen-item">
            <div class="valor">${totalVentas}</div>
            <div class="label"># DE VENTAS</div>
          </div>
          <div class="resumen-item">
            <div class="valor">$${ticketPromedio.toFixed(2)}</div>
            <div class="label">TICKET PROMEDIO</div>
          </div>
        </div>
      </div>

      <!-- Sección: Corte de Caja -->
      <div class="seccion">
        <h2>CORTE DE CAJA</h2>
        <div class="metodos-pago">
          <div class="metodo-item">
            <span><strong>EFECTIVO:</strong></span>
            <span>$${totalEfectivo.toFixed(2)} (${porcentajeEfectivo.toFixed(0)}%)</span>
          </div>
          <div class="metodo-item">
            <span><strong>TARJETA:</strong></span>
            <span>$${totalTarjeta.toFixed(2)} (${porcentajeTarjeta.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      <!-- Sección: Detalle de Ventas -->
      <div class="seccion">
        <h2>DETALLE DE VENTAS</h2>
        ${tablaVentas}
      </div>

      <div class="total-general">
        TOTAL GENERAL: $${totalIngresos.toFixed(2)}
      </div>

      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cerrar</button>
      </div>
    </body>
    </html>
  `;

  ventanaImpresion.document.write(contenidoImpresion);
  ventanaImpresion.document.close();
}

// Suscribirse a actualizaciones de ventas
private suscribirActualizacionesVentas() {
  console.log('📡 Reportes - Suscribiéndose a actualizaciones de ventas...');
  
  const subVentas = this.estadoVentas.ventasActualizadas$.subscribe(actualizado => {
    if (actualizado) {
      console.log('🔄 Actualizando reportes por anulación de venta...');
      this.loadReporte();
    }
  });
  
  this.subscriptions.push(subVentas);
}

// Limpiar suscripciones
ngOnDestroy(): void {
  console.log('🧹 Limpiando suscripciones de reportes...');
  this.subscriptions.forEach(sub => {
    if (sub && typeof sub.unsubscribe === 'function') {
      sub.unsubscribe();
    }
  });
  this.subscriptions = [];
}



}