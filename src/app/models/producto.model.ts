export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string;
  stock: number;
  imagen?: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}