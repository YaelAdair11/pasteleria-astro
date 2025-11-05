import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Venta {
  producto_nombre: string;
  cantidad: number;
  metodo_pago: string;
  total: number;
  fecha: Date;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas {
  filtro: string = '';

  ventas: Venta[] = [
    { producto_nombre: 'Pastel de tres leches', cantidad: 2, metodo_pago: 'Efectivo', total: 400, fecha: new Date() },
    { producto_nombre: 'Pay de limon', cantidad: 1, metodo_pago: 'Tarjeta', total: 125, fecha: new Date() },
  ];

  totalVentas(): number {
    return this.ventas.reduce((acc, v) => acc + v.total, 0);
  }

  filtrarVentas(): Venta[] {
    if (!this.filtro.trim()) return this.ventas;
    const texto = this.filtro.toLowerCase();
    return this.ventas.filter(v =>
      v.producto_nombre.toLowerCase().includes(texto) ||
      v.metodo_pago.toLowerCase().includes(texto)
    );
  }
}
