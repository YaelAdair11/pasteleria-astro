import { Producto } from './producto.model';

export interface Venta {
  id: string;
  producto_id: string;
  cantidad: number;
  metodo_pago: string;
  total: number;
  fecha: string;
  productos?: Producto[]; // Relación opcional con productos
}

export interface productosMasVendidos {
  producto_id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  stock: number;
  precio: number;
  imagen?: string;
  totalVendido: number;
}

export interface ReporteVentas {
  totalIngresos: number;
  totalVentas: number;
  ticketPromedio: number;
}

export interface VentaConProducto extends Venta {
  productos: Producto[];
}