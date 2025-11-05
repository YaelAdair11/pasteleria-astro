import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

interface ReporteData {
  totalIngresos: number;
  totalVentas: number;
  ticketPromedio: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class Reportes implements OnInit {
  // 'hoy' ahora se llama 'fechaSeleccionada' y es la fecha que controlamos
  fechaSeleccionada = new Date(); 
  
  reporte: ReporteData | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.loadReporte(); // Carga el reporte para el día de hoy al iniciar
  }

  /**
   * Carga el reporte para la fecha actualmente seleccionada.
   */
  async loadReporte(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // Llamamos al nuevo método del servicio pasándole la fecha
      this.reporte = await this.supabaseService.getReportesPorDia(this.fechaSeleccionada);
    } catch (error: any) {
      console.error('Error al cargar reporte:', error);
      this.error = 'No se pudo cargar el reporte. ' + error.message;
    }

    this.loading = false;
  }

  /**
   * Cambia la fecha seleccionada (suma o resta días) y recarga el reporte.
   * @param dias - El número de días a cambiar (ej: -1 para ayer, 1 para mañana)
   */
  cambiarDia(dias: number): void {
    const nuevaFecha = new Date(this.fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);

    // No permitir navegar al futuro
    if (nuevaFecha > new Date()) {
      return; 
    }

    this.fechaSeleccionada = nuevaFecha;
    this.loadReporte(); // ¡Volvemos a cargar los datos para la nueva fecha!
  }

  /**
   * Resetea la fecha a "hoy" y recarga el reporte.
   */
  volverAHoy(): void {
    this.fechaSeleccionada = new Date();
    this.loadReporte();
  }

  /**
   * Helper para saber si la fecha seleccionada es el día de hoy.
   * (Se usa para deshabilitar el botón de "siguiente")
   */
  esHoy(): boolean {
    const hoy = new Date();
    return this.fechaSeleccionada.getDate() === hoy.getDate() &&
           this.fechaSeleccionada.getMonth() === hoy.getMonth() &&
           this.fechaSeleccionada.getFullYear() === hoy.getFullYear();
  }
}