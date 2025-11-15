import { Categoria } from "./categoria.model";

export interface Producto {
  categoria_id: string;
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: Categoria;
  categoria_id: string;
  stock: number;
  imagen?: string;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}