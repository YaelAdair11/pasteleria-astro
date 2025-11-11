import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioEmpleado {
  mostrarAgregar = false;
  mostrarPedidos = false;

  pedidos: any[] = [];

  nuevoPedido: any = {
    nombre: '',
    telefono: '',
    kilos: 1,
    kilosIngresado: false,
    relleno: '',
    cubierta: '',
    tematica: '',
    fecha: '',
    lugar: '',
    estado: 'en proceso'
  };

  abrirModalAgregar() {
    this.mostrarAgregar = true;
  }

  abrirModalPedidos() {
    this.mostrarPedidos = true;
  }

  cerrarModal() {
    this.mostrarAgregar = false;
    this.mostrarPedidos = false;
  }

  guardarPedido() {
    this.pedidos.push({ ...this.nuevoPedido });
    this.nuevoPedido = {
      nombre: '',
      telefono: '',
      kilos: 1,
      kilosIngresado: false,
      relleno: '',
      cubierta: '',
      tematica: '',
      fecha: '',
      lugar: '',
      estado: 'en proceso'
    };
    this.cerrarModal();
  }

  verReporte(pedido: any) {
    alert(
      `📋 Reporte del Pedido:\n\nCliente: ${pedido.nombre}\nTeléfono: ${pedido.telefono}\n` +
      `Pastel: ${pedido.kilos}kg, Relleno ${pedido.relleno}, Cubierta ${pedido.cubierta}\n` +
      `Temática: ${pedido.tematica}\nEntrega: ${pedido.fecha} en ${pedido.lugar || 'Recoger en tienda'}`
    );
  }
}