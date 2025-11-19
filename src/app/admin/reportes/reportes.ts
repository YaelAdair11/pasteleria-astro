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
  imports: [ CommonModule ],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class Reportes implements OnInit {
  fechaSeleccionada = new Date(); 
  
  reporte: ReporteData | null = null;
  detalleVentas: any[] = []; 
  loading: boolean = true;
  error: string | null = null;

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
}