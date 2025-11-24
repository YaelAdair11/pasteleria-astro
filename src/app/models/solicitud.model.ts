export interface Solicitud {
  tipo: 'stock' | 'nuevo_producto' | 'editar_producto' | 'nueva_categoria';
  producto_id?: string | null;
  producto_nombre: string;
  cantidad: number;
  nota?: string;
}