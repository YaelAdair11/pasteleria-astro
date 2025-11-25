import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

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
  loading: boolean = true;
  error: string | null = null;

  // Corte de caja
  mostrarModalCorte: boolean = false;
  observaciones: string = '';
  procesandoCorte: boolean = false;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.loadReporte(); 
  }

  async loadReporte(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const [resumen, lista] = await Promise.all([
        this.supabaseService.getReportesPorDia(this.fechaSeleccionada),
        this.supabaseService.getVentasPorFecha(this.fechaSeleccionada)
      ]);

      this.reporte = resumen;
      this.detalleVentas = lista;

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

}