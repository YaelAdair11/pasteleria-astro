import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { Usuario } from '../models/usuario.model';
import { Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  // BehaviorSubject que almacena los datos completos del usuario
  private userSubject = new BehaviorSubject<Usuario | null>(null);
  public user$ = this.userSubject.asObservable();

  private readySubject = new BehaviorSubject<boolean>(false);
  public ready$ = this.readySubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
    this.initUser();
  }

  // Inicializa el BehaviorSubject al cargar la app
  private async initUser() {
    const { data: { session } } = await this.supabase.auth.getSession();

    if (session?.user) {
      const perfil = await this.cargarPerfil(session.user);
      this.userSubject.next(perfil);
    }

    this.readySubject.next(true);

    // Escucha cambios de auth (login/logout)
    this.supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const perfil = await this.cargarPerfil(session.user);
        this.userSubject.next(perfil);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  // ✅ Cargar los datos del usuario (solo 1 consulta)
  private async cargarPerfil(userAuth: User): Promise<Usuario> {
    // Leer datos desde tabla perfiles
    const { data: perfil } = await this.supabase
      .from('perfiles')
      .select('username, rol, avatar, email')
      .eq('id', userAuth.id)
      .single();

    return {
      ...(userAuth as User),
      username: (perfil?.username || userAuth?.user_metadata?.['username'] || '').trim(),
      rol: perfil?.rol,
      avatar: perfil?.avatar || userAuth?.user_metadata?.['avatar'] || 'default-avatar.png',
      email: userAuth?.email
    } as Usuario;
  }

  // =================== AUTH ===================
  async signInWithEmailOrUsername(login: string, password: string) {
    const { data: perfil, error } = await this.supabase
      .from('perfiles')
      .select('email')
      .or(`username.eq.${login},email.eq.${login}`)
      .single();

    if (error || !perfil?.email) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    return this.supabase.auth.signInWithPassword({
      email: perfil.email,
      password,
    });
  }

  // Logout
  async signOut() {
    await this.supabase.auth.signOut();
    this.userSubject.next(null);
  }

  // Devuelve la sesión actual
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // =================== ROLES ===================
  async getRolUsuario(userId: string) {
    return this.supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();
  }

  // =================== EMPLEADOS ===================
  
  async getEmpleados(): Promise<Empleado[]> {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, username, email, avatar, rol')
      .eq('rol', 'empleado') 
      .order('username', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async crearEmpleado(empleadoData: any) {
    console.log("Servicio: Insertando en 'perfiles':", empleadoData);
    const { data, error } = await this.supabase
      .from('perfiles')
      .insert([
        { 
          username: empleadoData.username,
          email: empleadoData.email,
          rol: 'empleado' 
        }
      ])
      .select('id, username, email, avatar, rol') 
      .single(); 

    if (error) {
      console.error("Error en insert:", error.message);
      return { data: null, error: error }; 
    }
    return { data: [data], error: null };
  }

  async borrarEmpleado(id: string) {
    console.log("Servicio: Borrando empleado con ID:", id);
    const { error } = await this.supabase
      .from('perfiles')
      .delete()
      .eq('id', id); 

    if (error) {
      console.error("Error en delete:", error.message);
      return { error: error };
    }
    return { error: null }; 
  }

  async updateEmpleado(id: string, empleadoData: any) {
    console.log("Servicio: Actualizando empleado con ID:", id);

    const { data, error } = await this.supabase
      .from('perfiles')
      .update({ 
        username: empleadoData.username,
        rol: empleadoData.rol
      })
      .eq('id', id)
      .select('id, username, email, avatar, rol')
      .single();

    if (error) {
      console.error("Error en update:", error.message);
      return { data: null, error: error };
    }
    
    return { data: data, error: null };
  }

  // =================== AGENDA / TURNOS ===================

  /**
   * Obtiene TODOS los turnos guardados de la agenda.
   */
  async getAgendaSemanal() {
    const { data, error } = await this.supabase
      .from('agenda_turnos')
      .select('empleado_id, dia_semana, tarea');

    if (error) {
      console.error('Error cargando agenda:', error);
      throw error;
    }
    return data ?? [];
  }

  /**
   * Inserta o actualiza (Upsert) un turno específico para un empleado.
   * Si la 'tarea' está vacía, lo trata como un borrado.
   */
  async upsertTurno(empleado_id: string, dia_semana: number, tarea: string) {
    
    if (!tarea || tarea.trim() === '') {
      return this.borrarTurno(empleado_id, dia_semana);
    }

    const { error } = await this.supabase
      .from('agenda_turnos')
      .upsert({
        empleado_id: empleado_id,
        dia_semana: dia_semana,
        tarea: tarea.trim()
      }, {
        onConflict: 'empleado_id, dia_semana'
      });
      
    if (error) {
      console.error('Error guardando turno:', error);
      throw error;
    }
    return { success: true };
  }

  /**
   * Borra un turno específico de la agenda.
   */
  async borrarTurno(empleado_id: string, dia_semana: number) {
    const { error } = await this.supabase
      .from('agenda_turnos')
      .delete()
      .match({
        empleado_id: empleado_id,
        dia_semana: dia_semana
      });

    if (error) {
      console.error('Error borrando turno:', error);
      throw error;
    }
    return { success: true };
  }

  // =================== PRODUCTOS ===================
  async getProductos(admin = false): Promise<Producto[]> { // Especificamos el tipo de retorno
    let query = this.supabase
      .from('productos')
      .select(`*, categoria:categorias ( id, nombre )`)
      .order('nombre', { ascending: true });

    // Solo filtrar los activos si NO es admin
    if (!admin) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en getProductos:', error);
      throw error;
    }
    
    // El 'data' ya coincide con el modelo Producto (con 'categorias' anidado)
    return data as Producto[];
  }

  async addProducto(producto: any) {
    const { data, error } = await this.supabase
      .from('productos')
      .insert(producto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProducto(id: string, cambios: any) {
    const { data, error } = await this.supabase
      .from('productos')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteProducto(id: string) {
    const { error } = await this.supabase
      .from('productos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async uploadImagenProducto(file: File): Promise<string> {
    
    const BUCKET_NAME = 'productos';

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      throw uploadError;
    }

    const { data } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error('No se pudo obtener la URL pública.');
    }

    return data.publicUrl;
  }

  async deleteImagenProducto(publicUrl: string | null | undefined): Promise<void> {
    
    if (!publicUrl) {
      console.log('No hay URL pública, no se borra nada.');
      return;
    }

    const BUCKET_NAME = 'productos';
    
    try {
      const path = publicUrl.split(`/${BUCKET_NAME}/`)[1];
      
      if (!path) {
        console.warn('No se pudo extraer el path del archivo de la URL:', publicUrl);
        return;
      }

      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        throw error;
      }
      
      console.log('Imagen antigua borrada exitosamente:', path);

    } catch (error) {
      console.error('Error borrando imagen antigua:', error);
    }
  }

  // =================== CATEGORÍAS ===================
  
  async getCategorias() {
    const { data, error } = await this.supabase
      .from('categorias')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
  }

  async addCategoria(categoria: any) {
    const { data, error } = await this.supabase
      .from('categorias')
      .insert(categoria)
      .select();
    if (error) throw error;
    return data;
  }

  async updateCategoria(id: string, cambios: any) {
    const { data, error } = await this.supabase
      .from('categorias')
      .update(cambios)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteCategoria(id: string) {
    const { error } = await this.supabase
      .from('categorias')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // =================== VENTAS ===================

  /**
   * Obtiene el historial de ventas, con el nombre del producto relacionado.
   * Puede filtrar por el nombre del producto.
   */
  async getVentas(filtro: string = '') {
    let query = this.supabase
      .from('ventas')
      .select('id, cantidad, metodo_pago, total, fecha, productos(nombre)')
      .order('fecha', { ascending: false });

    // Aplicamos el filtro si existe
    if (filtro && filtro.trim()) {
      query = query.filter(
        'productos.nombre',
        'ilike',
        `%${filtro.trim()}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en getVentas:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * ✨ NUEVA: Obtiene los productos más vendidos con datos REALES
   * Agrupa las ventas por producto y suma las cantidades
   */
  async getProductosMasVendidos(limite: number = 5) {
    try {
      // 1. Obtener TODAS las ventas con el nombre del producto
      const { data: ventas, error } = await this.supabase
        .from('ventas')
        .select('producto_id, cantidad, productos(nombre, categoria, stock, imagen)')
        .order('fecha', { ascending: false });

      if (error) throw error;
      if (!ventas || ventas.length === 0) return [];

      // 2. Agrupar por producto_id y sumar cantidades
      const ventasPorProducto = ventas.reduce((acc: any, venta: any) => {
        const id = venta.producto_id;
        
        if (!acc[id]) {
          acc[id] = {
            producto_id: id,
            nombre: venta.productos?.nombre || 'Sin nombre',
            categoria: venta.productos?.categoria || 'Sin categoría',
            stock: venta.productos?.stock || 0,
            imagen: venta.productos?.imagen || null,
            totalVendido: 0
          };
        }
        
        acc[id].totalVendido += venta.cantidad;
        return acc;
      }, {});

      // 3. Convertir a array y ordenar por totalVendido (descendente)
      const productosOrdenados = Object.values(ventasPorProducto)
        .sort((a: any, b: any) => b.totalVendido - a.totalVendido)
        .slice(0, limite);

      return productosOrdenados;

    } catch (error) {
      console.error('Error en getProductosMasVendidos:', error);
      throw error;
    }
  }

  /**
   * Obtiene reportes de ventas por día específico
   */
  async getReportesPorDia(fecha: Date) {
    const dia = new Date(fecha);
    const inicioDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
    const finDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();

    const { data, error } = await this.supabase
      .from('ventas')
      .select('total')
      .gte('fecha', inicioDelDia)
      .lte('fecha', finDelDia);

    if (error) {
      console.error('Error en getReportesPorDia:', error);
      throw new Error(error.message);
    }

    const totalVentas = data.length;
    const totalIngresos = data.reduce((acc, v) => acc + v.total, 0);
    const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    return {
      totalIngresos,
      totalVentas,
      ticketPromedio
    };
  }

  /**
   * ✨ NUEVA: Obtiene ventas de los últimos N días (para gráficos)
   */
  async getVentasUltimosDias(dias: number = 7) {
    try {
      const hoy = new Date();
      const fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - dias);
      fechaInicio.setHours(0, 0, 0, 0);

      const { data, error } = await this.supabase
        .from('ventas')
        .select('total, fecha')
        .gte('fecha', fechaInicio.toISOString())
        .order('fecha', { ascending: true });

      if (error) throw error;

      // Agrupar por día
      const ventasPorDia: { [key: string]: number } = {};
      
      data.forEach((venta: any) => {
        const fecha = new Date(venta.fecha);
        const dia = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!ventasPorDia[dia]) {
          ventasPorDia[dia] = 0;
        }
        ventasPorDia[dia] += venta.total;
      });

      return ventasPorDia;

    } catch (error) {
      console.error('Error en getVentasUltimosDias:', error);
      throw error;
    }
  }

  /**
   * ✨ NUEVA: Obtiene ventas agrupadas por categoría (para gráfico de donut)
   */
  async getVentasPorCategoria() {
    try {
      const { data, error } = await this.supabase
        .from('ventas')
        .select('cantidad, productos(categoria)');

      if (error) throw error;
      if (!data || data.length === 0) return {};

      // Agrupar por categoría
      const ventasPorCategoria: { [key: string]: number } = {};
      
      data.forEach((venta: any) => {
        const categoria = venta.productos?.categoria || 'Sin categoría';
        
        if (!ventasPorCategoria[categoria]) {
          ventasPorCategoria[categoria] = 0;
        }
        ventasPorCategoria[categoria] += venta.cantidad;
      });

      return ventasPorCategoria;

    } catch (error) {
      console.error('Error en getVentasPorCategoria:', error);
      throw error;
    }
  }

  /**
 * ✨ NUEVO: Registrar venta con actualización automática de stock
 */
async registrarVentaConStock(ventaData: any) {
  try {
    console.log('🛒 Registrando venta con actualización de stock...');
    
    // 1. Obtener producto actual para verificar stock
    const { data: producto, error: errorProducto } = await this.supabase
      .from('productos')
      .select('stock, nombre')
      .eq('id', ventaData.producto_id)
      .single();

    if (errorProducto) throw new Error(`Producto no encontrado: ${errorProducto.message}`);
    if (!producto) throw new Error('Producto no existe');
    if (producto.stock < ventaData.cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${ventaData.cantidad}`);
    }

    // 2. Insertar la venta
    const { data: venta, error: errorVenta } = await this.supabase
      .from('ventas')
      .insert([{
        producto_id: ventaData.producto_id,
        cantidad: ventaData.cantidad,
        total: ventaData.total,
        metodo_pago: ventaData.metodo_pago,
        fecha: new Date().toISOString()
      }])
      .select()
      .single();

    if (errorVenta) throw new Error(`Error al registrar venta: ${errorVenta.message}`);

    // 3. Actualizar stock del producto
    const nuevoStock = producto.stock - ventaData.cantidad;
    const { error: errorStock } = await this.supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', ventaData.producto_id);

    if (errorStock) throw new Error(`Error al actualizar stock: ${errorStock.message}`);

    console.log(`✅ Venta registrada. Stock actualizado: ${producto.nombre} - ${producto.stock} → ${nuevoStock}`);
    
    return venta;

  } catch (error) {
    console.error('❌ Error en registrarVentaConStock:', error);
    throw error;
  }
}

  // =================== REALTIME ===================

  /**
   * Suscribirse a cambios en VENTAS
   */
  suscribirCambiosVentas(callback: (payload: any) => void) {
    return this.supabase
      .channel('cambios-ventas-directo')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ventas'
        },
        (payload) => {
          console.log('💰 NUEVA VENTA EN TIEMPO REAL:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }

  /**
   * Suscribirse a cambios en PRODUCTOS (para stock)
   */
  suscribirCambiosProductos(callback: (payload: any) => void) {
    return this.supabase
      .channel('cambios-productos-directo')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'productos'
        },
        (payload) => {
          console.log('📦 PRODUCTO ACTUALIZADO:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }

}