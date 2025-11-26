export interface VentaPendiente {
    id: string;
    usuario_id: string;
    cliente_nombre: string | null;
    carrito: any[]; // Se guardará como JSONB en Supabase
    fecha_creacion: string; // ISO string
    estado: 'pendiente' | 'recuperada' | 'cancelada';
}
