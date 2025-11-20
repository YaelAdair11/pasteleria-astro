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

  tiposProductos = ['Pastel', 'Bebida', 'Galletas', 'Postre'];

  nuevoPedido: any = {
    Tipo: '',
    nombre: '',
    telefono: '',
    fecha: '',
    lugar: '',
  
    // pastel
    color: '',
    kilos: '',
    relleno: '',
    tematica: '',
  
    // bebidas, galletas, postres
    sabor: '',
    cantidad: '',
    tamano: '',
    tipoPostre: '',
  
    estado: 'en proceso'
  };
  
  // 👉 Métodos principales
  abrirModalAgregar() { this.mostrarAgregar = true; }
  abrirModalPedidos() { this.mostrarPedidos = true; }
  cerrarModal() {
    this.mostrarAgregar = false;
    this.mostrarPedidos = false;
  
    // 🔄 Reiniciar el formulario para que al abrirlo esté vacío
    this.nuevoPedido = {
      Tipo: '',
      nombre: '',
      telefono: '',
      fecha: '',
      lugar: '',
      
      // pastel
      color: '',
      kilos: '',
      relleno: '',
      tematica: '',
      
      // bebidas, galletas, postres
      sabor: '',
      cantidad: '',
      tamano: '',
      tipoPostre: '',
  
      estado: 'en proceso'
    };
  }
  

  guardarPedido() {
    this.pedidos.push({ ...this.nuevoPedido });

    this.nuevoPedido = {
      Tipo: '',
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

  // ✅👉 AQUÍ va tu verReporte() (posición correcta)
  reporteSeleccionado: any = null;

  verReporte(pedido: any) {
    this.reporteSeleccionado = pedido; // abre modal
  }
  
  cerrarReporte() {
    this.reporteSeleccionado = null; // cierra modal
  }  
}