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
  this.crearGraficoVentas(); // ✅ PRIMERO crear el gráfico
  await this.cargarDatosReales(); // ✅ LUEGO cargar datos
  this.suscribirCambiosTiempoReal();

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

  // En inicio.ts - método cargarDatosReales
async cargarDatosReales() {
  try {
    console.log('🔄 Cargando datos reales del dashboard...');
    
    const [reporte, productos, productosMasVendidos, totalEmpleados, ventasSemana] = await Promise.all([
      this.supabaseService.getReportesPorDia(new Date()),
      this.supabaseService.getProductos(true),
      this.supabaseService.getProductosMasVendidos(5),
      this.supabaseService.contarEmpleadosActivos(),
      this.supabaseService.getVentasUltimosDias(7)
    ]);
    
    // ✅ DEBUG CRÍTICO
    console.log('🔍 REPORTE HOY:', reporte);
    console.log('🔍 VENTAS SEMANA:', ventasSemana);
    
    // Actualizar métricas
    this.metricas.ventasHoy = reporte.totalIngresos;
    this.metricas.productosStock = productos.length;
    this.metricas.empleadosActivos = totalEmpleados;
    
    this.productosMasVendidos = productosMasVendidos as productosMasVendidos[];
    
    // ✅ ACTUALIZAR GRÁFICO
    this.actualizarGraficoVentas(ventasSemana);
    
  } catch (error) {
    console.error('❌ Error cargando datos del dashboard:', error);
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

  // ✅ NUEVO: Suscribirse a cambios en empleados
  const subEmpleados = this.supabaseService.suscribirCambiosEmpleados(() => {
    console.log('👥 Empleado agregado/eliminado, actualizando dashboard...');
    this.cargarDatosReales();
  });

  this.subscriptions.push(subVentas, subProductos, subEmpleados);
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
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(240, 98, 146, 0.8)',
        borderColor: 'rgba(240, 98, 146, 1)',
        borderWidth: 1,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
        borderRadius: 6, // ✅ ESQUINAS REDONDEADAS
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const valor = context.parsed.y;
              return `Ventas: $${(valor || 0).toLocaleString('es-MX', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              // ✅ FORMATO MEXICANO CON SEPARADORES DE MILES
              return `$${Number(value).toLocaleString('es-MX')}`;
            },
            font: {
              size: 11
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12,
              weight: 'bold'
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
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
 * ✨ ACTUALIZA el gráfico con datos REALES de ventas
 */
private actualizarGraficoVentas(ventasPorDia: any) {
  console.log('🔍 DATOS QUE LLEGAN AL GRÁFICO:', ventasPorDia);
  
  if (!this.ventasChart) {
    console.log('❌ No hay gráfico inicializado');
    return;
  }
  
  try {
    const { labels, datos } = this.formatearDatosParaGrafico(ventasPorDia);
    console.log('📊 Datos formateados:', { labels, datos });
    
    // Actualizar el gráfico existente
    this.ventasChart.data.labels = labels;
    this.ventasChart.data.datasets[0].data = datos;
    this.ventasChart.update('none');
    
  } catch (error) {
    console.error('❌ Error actualizando gráfico:', error);
  }
}

/**
 * ✨ FORMATEA datos de ventas para el gráfico
 */
private formatearDatosParaGrafico(ventasPorDia: { [key: string]: number }) {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const labels = [];
  const datos = [];
  
  // Generar últimos 7 días
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    
    const diaKey = fecha.toISOString().split('T')[0];
    const nombreDia = dias[fecha.getDay()];
    
    labels.push(nombreDia);
    
    let ventaDelDia = ventasPorDia[diaKey] || 0;
    
    // Si el valor es muy bajo (menos de 1 peso), asumimos que son centavos
    if (ventaDelDia > 0 && ventaDelDia < 1) {
      ventaDelDia = ventaDelDia * 100; // Convertir a pesos
    }
    
    datos.push(ventaDelDia);
  }
  
  console.log('💰 Datos formateados para gráfico:', datos);
  return { labels, datos };
}


}