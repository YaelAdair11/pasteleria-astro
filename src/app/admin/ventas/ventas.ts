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
  // Filtros
  filtroNombre: string = '';
  vendedorSeleccionado: string = ''; // ID del vendedor
  
  // Datos
  ventasOriginales: any[] = []; // Guardamos todas las ventas traídas de la BD
  ventasFiltradas: any[] = [];  // Estas son las que mostramos en la tabla
  vendedores: any[] = [];       // Lista de usuarios/empleados
  
  // Estados
  loading: boolean = true;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  async cargarDatosIniciales(): Promise<void> {
    this.loading = true;
    try {
      // 1. Cargamos los vendedores (Perfiles)
      // Asumiendo que tienes un método getPerfiles o similar
      const perfiles = await this.supabaseService.getPerfiles(); 
      this.vendedores = perfiles.filter((p: any) => p.rol === 'empleado' || p.rol === 'admin');

      // 2. Cargamos las ventas
      await this.loadVentas();
      
    } catch (error: any) {
      console.error('Error inicializando:', error);
      this.error = error.message;
    }
    this.loading = false;
  }

  async loadVentas(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // Traemos las ventas (idealmente sin filtro de nombre desde el backend para poder filtrar localmente todo junto, 
      // o le pasas '' para traer todo y filtrar aquí por fecha primero)
      const data = await this.supabaseService.getVentas(''); 
      
      this.ventasOriginales = data;
      this.aplicarFiltros(); // Aplicamos la lógica de filtros aquí

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
      // 1. Filtro de FECHA (Solo hoy)
      const fechaVenta = new Date(venta.fecha);
      const esHoy = fechaVenta.toDateString() === fechaHoyString;

      if (!esHoy) return false; 

      // 2. Filtro de VENDEDOR (Modificado para no fallar)
      if (this.vendedorSeleccionado) {
        if (!venta.usuario_id || venta.usuario_id !== this.vendedorSeleccionado) {
          return false;
        }
      }

      // 3. Filtro de NOMBRE
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
}