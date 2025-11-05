import { AfterViewInit, Component } from '@angular/core';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-inicio',
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements AfterViewInit {
  
  ngAfterViewInit() {
    // Registrar todos los componentes de Chart.js
    Chart.register(...registerables);
    
    this.crearGraficoVentas();
  }

private crearGraficoVentas() {
  const ctx = document.getElementById('ventasChart') as HTMLCanvasElement;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Ventas ($)',
        data: [1200, 1900, 1500, 2200, 1800, 2500, 2100],
        backgroundColor: 'rgba(198, 43, 102, 0.8)',
        borderColor: 'rgba(198, 43, 102, 1)',
        borderWidth: 1,
        barPercentage: 0.6, // Barras más delgadas
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Permite controlar altura
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
}