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

  // Nuevas propiedades para corte de caja
  mostrarModalCorte: boolean = false;
  fondoInicial: number = 0;
  fondoFinal: number = 0;
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

  // =================== MÉTODOS CORTE DE CAJA ===================
  
  abrirModalCorte(): void {
    this.mostrarModalCorte = true;
    this.fondoInicial = 0;
    this.fondoFinal = 0;
    this.observaciones = '';
  }

  async realizarCorte(): Promise<void> {
    if (!this.reporte) return;

    this.procesandoCorte = true;
    
    try {
      // Obtener ventas detalladas por método de pago
      const ventasDelDia = await this.supabaseService.getVentasParaCorte(this.fechaSeleccionada);
      
      const totalEfectivo = ventasDelDia
        .filter((v: any) => v.metodo_pago === 'Efectivo')
        .reduce((sum: number, v: any) => sum + v.total, 0);
      
      const totalTarjeta = ventasDelDia
        .filter((v: any) => v.metodo_pago === 'Tarjeta')
        .reduce((sum: number, v: any) => sum + v.total, 0);

      const diferencia = this.calcularDiferencia();

      const corteData = {
        total_ventas: this.reporte.totalIngresos,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        ventas_totales: this.reporte.totalVentas,
        fondo_inicial: this.fondoInicial,
        fondo_final: this.fondoFinal,
        diferencia: diferencia,
        observaciones: this.observaciones
      };

      const corte = await this.supabaseService.realizarCorteCaja(corteData);
      
      alert(`✅ Corte de caja realizado exitosamente\nDiferencia: $${diferencia.toFixed(2)}`);
      this.mostrarModalCorte = false;
      
    } catch (error: any) {
      console.error('Error en corte de caja:', error);
      alert('❌ Error al realizar corte: ' + error.message);
    }
    
    this.procesandoCorte = false;
  }

  calcularDiferencia(): number {
    if (!this.reporte) return 0;
    
    const ventasEfectivo = this.detalleVentas
      .filter((v: any) => v.metodo_pago === 'Efectivo')
      .reduce((sum: number, v: any) => sum + v.total, 0);
    
    return this.fondoFinal - (this.fondoInicial + ventasEfectivo);
  }

  cerrarModalCorte(): void {
    this.mostrarModalCorte = false;
  }
}