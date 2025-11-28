import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

// 🔹 Interfaces internas
interface ProductoVenta {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface PerfilUsuario {
  id: number;
  nombre: string;
  email?: string;
}

export interface Venta {
  id: number;
  cliente_id?: number;
  fecha: string;
  metodo?: string;
  total?: number;
  anulada: boolean;
  anulacion?: any;
  productos: any[];  // debe ser array
  perfiles?: any;
}


@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas implements OnInit {

  ventas: Venta[] = [];
  ventasFiltradas: Venta[] = [];

  fechaInicio: string = "";
  fechaFin: string = "";

  reporteSeleccionado: Venta | null = null;
  mostrarModalReporte = false;
  mostrarVentas = false;

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
      const data: Venta[] = await this.supabaseService.getVentas();
      this.ventas = data || [];
      this.ventasFiltradas = [...this.ventas];
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  }

  // 🔹 Filtrar ventas por rango de fechas
  filtrarPorFecha() {
    if (!this.fechaInicio || !this.fechaFin) return;

    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    fin.setHours(23, 59, 59, 999);

    this.ventasFiltradas = this.ventas.filter((v: Venta) => {
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
  verReporte(venta: Venta) {
    console.log(venta);
    this.reporteSeleccionado = venta;
    this.mostrarModalReporte = true;
  }

  // 🔹 Cerrar reporte
  cerrarReporte() {
    this.mostrarModalReporte = false;
    this.reporteSeleccionado = null;
  }

  toggleTodasVentas() {
    this.mostrarVentas = !this.mostrarVentas;
  }

  // 🔹 Descargar reporte como archivo TXT
  descargarReporte() {
    if (!this.reporteSeleccionado) return;

    const venta: Venta = this.reporteSeleccionado;

    let texto = `----- Reporte de Venta -----\n`;
    texto += `Fecha: ${venta.fecha}\n`;
    texto += `Cliente: ${venta.perfiles?.nombre || 'N/A'}\n`;
    texto += `Método: ${venta.metodo || 'N/A'}\n\nProductos:\n`;

    (venta.productos || []).forEach(p => {
      texto += `${p.nombre} x${p.cantidad} - $${(p.precio * p.cantidad).toFixed(2)}\n`;
    });

    texto += `\nTotal: $${(venta.total || 0).toFixed(2)}\n`;
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
