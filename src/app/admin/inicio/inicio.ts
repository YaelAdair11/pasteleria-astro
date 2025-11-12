import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SupabaseService } from '../../services/supabase.service';
import { productosMasVendidos } from '../../models/venta.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioComponent implements AfterViewInit, OnDestroy {
  
  metricas = {
    ventasHoy: 0,
    productosStock: 0,
    empleadosActivos: 8,
    clientesNuevos: 15
  };

  productosMasVendidos: productosMasVendidos[] = [];

  now = new Date();
  private ventasChart: any;
  private categoriasChart: any;
  private subscriptions: any[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngAfterViewInit() {
    Chart.register(...registerables);
    await this.cargarDatosReales();
    this.suscribirCambiosTiempoReal();
    this.crearGraficoVentas();
    this.crearGraficoCategorias();

    setInterval(() => {
      this.now = new Date();
    }, 60000);
  }

  ngOnDestroy() {
    console.log('🧹 Limpiando suscripciones del dashboard...');
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
    
    if (this.ventasChart) this.ventasChart.destroy();
    if (this.categoriasChart) this.categoriasChart.destroy();
  }

  async cargarDatosReales() {
    try {
      console.log('🔄 Cargando datos reales del dashboard...');
      
      const [reporte, productos, productosMasVendidos] = await Promise.all([
        this.supabaseService.getReportesPorDia(new Date()),
        this.supabaseService.getProductos(true),
        this.supabaseService.getProductosMasVendidos(5)
      ]);
      
      this.metricas.ventasHoy = reporte.totalIngresos;
      this.metricas.productosStock = productos.length;
      
      // ✅ SOLUCIÓN SIMPLE - Type assertion
      this.productosMasVendidos = productosMasVendidos as productosMasVendidos[];
      
      console.log('📊 Datos actualizados correctamente');
      
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      this.mostrarError('Error al cargar datos del dashboard. Reintentando...');
      setTimeout(() => this.cargarDatosReales(), 5000);
    }
  }

  private mostrarError(mensaje: string) {
    console.warn('⚠️ Error para el usuario:', mensaje);
  }

  private suscribirCambiosTiempoReal() {
    console.log('🔔 Suscribiéndose a cambios en tiempo real...');
    
    const subVentas = this.supabaseService.suscribirCambiosVentas(() => {
      console.log('💰 Nueva venta detectada, actualizando dashboard...');
      this.cargarDatosReales();
    });

    const subProductos = this.supabaseService.suscribirCambiosProductos(() => {
      console.log('📦 Stock actualizado, actualizando dashboard...');
      this.cargarDatosReales();
    });

    this.subscriptions.push(subVentas, subProductos);
  }

  private crearGraficoVentas() {
    const ctx = document.getElementById('ventasChart') as HTMLCanvasElement;
    if (!ctx) return;
    
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

  /**
   * ✨ NUEVO: Cargar datos reales para gráfico de ventas
   */
  async cargarDatosGraficoVentas() {
    try {
      // Obtener ventas de los últimos 7 días
      const ventasUltimaSemana = await this.supabaseService.getVentasUltimosDias(7);
      
      // Formatear datos para el gráfico
      const labels = this.generarLabelsUltimos7Dias();
      const datosReales = this.formatearDatosVentasParaGrafico(ventasUltimaSemana);
      
      // Actualizar gráfico si existe
      if (this.ventasChart) {
        this.ventasChart.data.labels = labels;
        this.ventasChart.data.datasets[0].data = datosReales;
        this.ventasChart.update('none');
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos para gráfico de ventas:', error);
    }
  }

  /**
   * ✨ NUEVO: Cargar datos reales para gráfico de categorías
   */
  async cargarDatosGraficoCategorias() {
    try {
      const ventasPorCategoria = await this.supabaseService.getVentasPorCategoria();
      
      // Formatear datos para el gráfico de donut
      const { labels, datos, colores } = this.formatearDatosCategoriasParaGrafico(ventasPorCategoria);
      
      // Actualizar gráfico si existe
      if (this.categoriasChart) {
        this.categoriasChart.data.labels = labels;
        this.categoriasChart.data.datasets[0].data = datos;
        this.categoriasChart.data.datasets[0].backgroundColor = colores;
        this.categoriasChart.update('none');
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos para gráfico de categorías:', error);
    }
  }

  /**
   * ✨ NUEVO: Generar labels de los últimos 7 días
   */
  private generarLabelsUltimos7Dias(): string[] {
    const labels = [];
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      labels.push(dias[fecha.getDay()]);
    }
    
    return labels;
  }

  /**
   * ✨ NUEVO: Formatear datos de ventas para el gráfico
   */
  private formatearDatosVentasParaGrafico(ventasPorDia: any): number[] {
    const datos = [];
    const hoy = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const diaKey = fecha.toISOString().split('T')[0];
      
      datos.push(ventasPorDia[diaKey] || 0);
    }
    
    return datos;
  }

  /**
   * ✨ NUEVO: Formatear datos de categorías para el gráfico
   */
  private formatearDatosCategoriasParaGrafico(ventasPorCategoria: any) {
    const coloresBase = [
      'rgba(198, 43, 102, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(201, 203, 207, 0.8)',
      'rgba(255, 205, 86, 0.8)'
    ];
    
    const categorias = Object.keys(ventasPorCategoria);
    const datos = Object.values(ventasPorCategoria) as number[];
    const colores = categorias.map((_, index) => coloresBase[index % coloresBase.length]);
    
    return {
      labels: categorias,
      datos: datos,
      colores: colores
    };
  }
}