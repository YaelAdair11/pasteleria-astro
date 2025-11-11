import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule], // ← AGREGAR CommonModule AQUÍ
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioComponent implements AfterViewInit, OnDestroy {
  
  // MÉTRICAS EN TIEMPO REAL
  metricas = {
    ventasHoy: 0,
    productosStock: 0,
    empleadosActivos: 8,
    clientesNuevos: 15
  };

  // Variable para la fecha actual
  now = new Date();

  private ventasChart: any;
  private categoriasChart: any;
  private subscriptions: any[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngAfterViewInit() {
    // Registrar todos los componentes de Chart.js
    Chart.register(...registerables);
    
    // Cargar datos iniciales
    await this.cargarDatosReales();
    
    // Suscribirse a cambios en tiempo real
    this.suscribirCambiosTiempoReal();
    
    // Crear gráficos
    this.crearGraficoVentas();
    this.crearGraficoCategorias();

    // Actualizar la hora cada minuto
    setInterval(() => {
      this.now = new Date();
    }, 60000);
  }

  ngOnDestroy() {
    // Limpiar suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Destruir gráficos
    if (this.ventasChart) {
      this.ventasChart.destroy();
    }
    if (this.categoriasChart) {
      this.categoriasChart.destroy();
    }
  }

  /**
   * Carga los datos REALES desde Supabase
   */
  async cargarDatosReales() {
    try {
      console.log('🔄 Cargando datos reales del dashboard...');
      
      // Obtener reporte del día actual
      const reporte = await this.supabaseService.getReportesPorDia(new Date());
      
      // Obtener productos para calcular stock
      const productos = await this.supabaseService.getProductos(true);
      
      // Actualizar métricas con datos REALES
      this.metricas.ventasHoy = reporte.totalIngresos;
      this.metricas.productosStock = productos.length;
      
      console.log('📊 Datos actualizados:', this.metricas);
      
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
    }
  }

  /**
   * Suscribirse a cambios en tiempo real
   */
  private suscribirCambiosTiempoReal() {
    console.log('🔔 Suscribiéndose a cambios en tiempo real...');
    
    // Suscribirse a NUEVAS VENTAS
    const subVentas = this.supabaseService.suscribirCambiosVentas((payload) => {
      console.log('💰 Nueva venta detectada, actualizando dashboard...');
      this.cargarDatosReales(); // Recargar todo el dashboard
    });

    // Suscribirse a CAMBIOS EN PRODUCTOS (stock)
    const subProductos = this.supabaseService.suscribirCambiosProductos((payload) => {
      console.log('📦 Stock actualizado, actualizando dashboard...');
      this.cargarDatosReales(); // Recargar todo el dashboard
    });

    this.subscriptions.push(subVentas, subProductos);
  }

  private crearGraficoVentas() {
    const ctx = document.getElementById('ventasChart') as HTMLCanvasElement;
    
    this.ventasChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Ventas ($)',
          data: [1200, 1900, 1500, 2200, 1800, 2500, 2100],
          backgroundColor: 'rgba(198, 43, 102, 0.8)',
          borderColor: 'rgba(198, 43, 102, 1)',
          borderWidth: 1,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  private crearGraficoCategorias() {
    const ctx = document.getElementById('categoriasChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    this.categoriasChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pasteles', 'Cupcakes', 'Galletas', 'Postres', 'Bebidas'],
        datasets: [{
          data: [35, 25, 20, 15, 5],
          backgroundColor: [
            'rgba(198, 43, 102, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(198, 43, 102, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  /**
   * Método para actualización manual
   */
  async actualizarManual() {
    console.log('🔄 Actualización manual del dashboard...');
    this.now = new Date(); // Actualizar la hora
    await this.cargarDatosReales();
  }
}