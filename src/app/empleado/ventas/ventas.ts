import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas implements OnInit {

  ventas: any[] = [];
  ventasFiltradas: any[] = [];

  fechaInicio: string = "";
  fechaFin: string = "";

  reporteSeleccionado: any = null;
  mostrarModalReporte = false;

  loading = false;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    await this.cargarVentas();
    this.loading = false;
  }

  // 🔹 Cargar ventas desde Supabase
  async cargarVentas() {
    try {
      const data = await this.supabaseService.getVentas();
      this.ventas = data || [];
      this.ventasFiltradas = [...this.ventas];
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  }

  // 🔹 Filtrar ventas por rango de fechas
  filtrarPorFecha() {
    if (!this.fechaInicio || !this.fechaFin) {
      return;
    }

    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);

    // Ajuste para incluir el día completo
    fin.setHours(23, 59, 59, 999);

    this.ventasFiltradas = this.ventas.filter((v: any) => {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= inicio && fechaVenta <= fin;
    });
  }

  // 🔹 Limpiar filtros
  limpiarFiltro() {
    this.fechaInicio = "";
    this.fechaFin = "";
    this.ventasFiltradas = [...this.ventas];
  }

  // 🔹 Abrir reporte
  verReporte(venta: any) {
    this.reporteSeleccionado = venta;
    this.mostrarModalReporte = true;
  }

  // 🔹 Cerrar reporte
  cerrarReporte() {
    this.mostrarModalReporte = false;
    this.reporteSeleccionado = null;
  }

  // 🔹 Descargar reporte como archivo TXT
  descargarReporte() {
    if (!this.reporteSeleccionado) return;

    let texto = `----- Reporte de Venta -----\n`;
    texto += `Fecha: ${this.reporteSeleccionado.fecha}\n`;
    texto += `Cliente: ${this.reporteSeleccionado.cliente || 'N/A'}\n`;
    texto += `Método: ${this.reporteSeleccionado.metodo}\n\nProductos:\n`;

    (this.reporteSeleccionado.productos || []).forEach((p: any) => {
      texto += `${p.nombre} x${p.cantidad} - $${(p.precio * p.cantidad).toFixed(2)}\n`;
    });

    texto += `\nTotal: $${(this.reporteSeleccionado.total || 0).toFixed(2)}\n`;
    texto += `----------------------------\n`;

    const blob = new Blob([texto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `reporte_venta_${Date.now()}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }
}
