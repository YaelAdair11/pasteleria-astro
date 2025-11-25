import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { Usuario } from '../models/usuario.model';
import { Producto } from '../models/producto.model';
import { productosMasVendidos } from '../models/venta.model';
import { Solicitud } from '../models/solicitud.model';

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

  // Cargar los datos del usuario (solo 1 consulta)
  private async cargarPerfil(userAuth: User): Promise<Usuario> {
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

  async signOut() {
    await this.supabase.auth.signOut();
    this.userSubject.next(null);
  }

  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async getRolUsuario(userId: string) {
    return this.supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();
  }

  // 🔥 MÉTODOS RECUPERADOS (Para arreglar el error) 🔥
  async resetPasswordForEmail(email: string) {
    const redirectTo = `${window.location.origin}/actualizar-contrasena`;
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });
    return { error };
  }

  async updateUserPassword(password: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: password
    });
    return { data, error };
  }

  // =================== EMPLEADOS / PERFILES ===================
  async getPerfiles() {
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('*')
      .order('username', { ascending: true });

    if (error) throw error;
    return data || [];
  }

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
    // Invoca la Edge Function 'crear-empleado' pasando los datos del empleado.
    const { data, error } = await this.supabase.functions.invoke('crear-empleado', {
      body: empleadoData,
    });

    if (error) {
      // Extrae y lanza el mensaje de error específico devuelto por la Edge Function.
      const errorMessage = error.context?.reason?.error || error.message || 'Error desconocido al crear el empleado.';
      throw new Error(errorMessage);
    }
    // Devuelve los datos del empleado creado por la función.
    // La función devuelve un array, por lo que lo adaptamos a la estructura esperada.
    const fullProfile = { ...(data as any)?.data, email: empleadoData.email };
    return { data: [fullProfile], error: null };
  }

  async borrarEmpleado(id: string) {
    // Invoca la Edge Function 'borrar-empleado' pasando el ID del usuario a eliminar.
    const { error } = await this.supabase.functions.invoke('borrar-empleado', {
      body: { user_id: id },
    });

    if (error) {
      // Línea de depuración para ver el error completo en la consola del navegador.
      console.error("Objeto de error completo de la Edge Function:", error);

      // Extrae y devuelve el mensaje de error específico.
      const errorMessage = error.context?.reason?.error || error.message || 'Error desconocido al borrar el empleado.';
      return { error: new Error(errorMessage) };
    }
    return { error: null };
  }

  async updateEmpleado(id: string, empleadoData: any) {
    // Invoca la Edge Function 'actualizar-empleado' con el ID y los datos a actualizar.
    const { error } = await this.supabase.functions.invoke('actualizar-empleado', {
        body: { user_id: id, updates: empleadoData },
    });

    if (error) {
      const errorMessage = error.context?.reason?.error || error.message || 'Error desconocido al actualizar el empleado.';
      return { data: null, error: new Error(errorMessage) };
    }
    
    // Tras la actualización exitosa, vuelve a solicitar los datos actualizados del perfil
    // para devolverlos al componente, manteniendo la consistencia de la UI.
    const { data: updatedData, error: fetchError } = await this.supabase
      .from('perfiles')
      .select('id, username, email, avatar, rol')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    return { data: updatedData, error: null };
  }

  async contarEmpleadosActivos(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true }) 
        .eq('rol', 'empleado');

      if (error) return 0;
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  // =================== AGENDA / TURNOS ===================
  async getAgendaSemanal() {
    const { data, error } = await this.supabase
      .from('agenda_turnos')
      .select('empleado_id, dia_semana, tarea');
    if (error) throw error;
    return data ?? [];
  }

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
    if (error) throw error;
    return { success: true };
  }

  async borrarTurno(empleado_id: string, dia_semana: number) {
    const { error } = await this.supabase
      .from('agenda_turnos')
      .delete()
      .match({ empleado_id: empleado_id, dia_semana: dia_semana });
    if (error) throw error;
    return { success: true };
  }

  // =================== PRODUCTOS ===================
  async getProductos(admin = false): Promise<Producto[]> {
    let query = this.supabase
      .from('productos')
      .select(`*, categoria:categorias ( id, nombre )`)
      .order('nombre', { ascending: true });

     if (!admin) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Producto[];
  }

  // Elimina un pedido por su ID
async eliminarPedido(id: string) {
  const { error } = await this.supabase
    .from('pedidos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


  async addProducto(producto: any) {
    const { data, error } = await this.supabase
      .from('productos')
      .insert(producto)
      .select().single();
    if (error) throw error;
    return data;
  }

  async updateProducto(id: string, cambios: any) {
    const { data, error } = await this.supabase
      .from('productos')
      .update(cambios)
      .eq('id', id)
      .select().single();
    if (error) throw error;
    return data;
  }

  async deleteProducto(id: string) {
    const { error } = await this.supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadImagenProducto(file: File): Promise<string> {
    const BUCKET_NAME = 'productos';
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data } = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    if (!data || !data.publicUrl) throw new Error('No se pudo obtener la URL pública.');
    return data.publicUrl;
  }

  async deleteImagenProducto(publicUrl: string | null | undefined): Promise<void> {
    if (!publicUrl) return;
    const BUCKET_NAME = 'productos';
    try {
      const path = publicUrl.split(`/${BUCKET_NAME}/`)[1];
      if (!path) return;
      await this.supabase.storage.from(BUCKET_NAME).remove([path]);
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

  async addCategoria(nombre: string) { 
    const { error } = await this.supabase.from('categorias').insert({ nombre: nombre });
    if (error) throw error;
  }
  
  async updateCategoria(id: string, nombre: string) { 
    const { error } = await this.supabase.from('categorias').update({ nombre: nombre }).eq('id', id);
    if (error) throw error;
  }

  async deleteCategoria(id: string) { 
    const { error } = await this.supabase.from('categorias').delete().eq('id', id);
    if (error) throw error;
  }

  // =================== VENTAS ===================
  async getVentas(filtro: string = '') {
    // Usamos '!ventas_usuario_id_fkey' para forzar la relación correcta
    let query = this.supabase
      .from('ventas')
      .select(`
        *,
        productos!inner ( nombre ),
        perfiles!ventas_usuario_id_fkey ( username ) 
      `) 
      .order('fecha', { ascending: false });

    if (filtro && filtro.trim()) {
      query = query.filter('productos.nombre', 'ilike', `%${filtro.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error trayendo ventas:', error.message);
      throw new Error(error.message);
    }
    return data;
  } 

  async getProductosMasVendidos(limite: number = 5): Promise<productosMasVendidos[]> {
    try {
      const { data: ventas, error } = await this.supabase
        .from('ventas')
        .select(`
          producto_id, 
          cantidad,
          productos!inner (
            nombre, precio, stock, imagen, categorias!inner ( nombre )
          )
        `)
        .eq('productos.activo', true);

      if (error) return [];
      if (!ventas || ventas.length === 0) return [];

      const ventasPorProducto = ventas.reduce((acc: any, venta: any) => {
        const pid = venta.producto_id;
        if (!acc[pid]) {
          acc[pid] = {
            producto_id: pid,
            nombre: venta.productos?.nombre,
            categoria: venta.productos?.categorias?.nombre,
            stock: venta.productos?.stock,
            precio: venta.productos?.precio,
            productos: venta.productos,
            imagen: venta.productos?.imagen,
            totalVendido: 0
          };
        }
        acc[pid].totalVendido += venta.cantidad;
        return acc;
      }, {});

      return Object.values(ventasPorProducto)
        .sort((a: any, b: any) => b.totalVendido - a.totalVendido)
        .slice(0, limite) as productosMasVendidos[];

    } catch (error) {
      return [];
    }
  }

  async getReportesPorDia(fecha: Date) {
    const dia = new Date(fecha);
    const inicioDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
    const finDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();

    const { data, error } = await this.supabase
      .from('ventas')
      .select('total')
      .gte('fecha', inicioDelDia)
      .lte('fecha', finDelDia);

    if (error) throw new Error(error.message);

    const totalVentas = data.length;
    const totalIngresos = data.reduce((acc, v) => acc + v.total, 0);
    const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    return { totalIngresos, totalVentas, ticketPromedio };
  }

  async getVentasPorFecha(fecha: Date) {
    const dia = new Date(fecha);
    const inicioDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
    const finDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();

    const { data, error } = await this.supabase
      .from('ventas')
      .select('id, cantidad, total, metodo_pago, fecha, productos(nombre, precio)') 
      .gte('fecha', inicioDelDia)
      .lte('fecha', finDelDia)
      .order('fecha', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

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

      if (error) return {};
      if (!data || data.length === 0) {
        const ventasVacias: { [key: string]: number } = {};
        for (let i = 6; i >= 0; i--) {
          const f = new Date();
          f.setDate(f.getDate() - i);
          ventasVacias[f.toISOString().split('T')[0]] = 0;
        }
        return ventasVacias;
      }

      const ventasPorDia: { [key: string]: number } = {};
      data.forEach((venta: any) => {
        const d = new Date(venta.fecha).toISOString().split('T')[0];
        if (!ventasPorDia[d]) ventasPorDia[d] = 0;
        ventasPorDia[d] += venta.total;
      });
      return ventasPorDia;
    } catch (error) {
      return {};
    }
  }

  async getVentasPorCategoria() {
    try {
      const { data, error } = await this.supabase
        .from('ventas')
        .select('cantidad, productos(categoria)');

      if (error || !data) return {};

      const ventasPorCategoria: { [key: string]: number } = {};
      data.forEach((venta: any) => {
        const categoria = venta.productos?.categoria || 'Sin categoría';
        if (!ventasPorCategoria[categoria]) ventasPorCategoria[categoria] = 0;
        ventasPorCategoria[categoria] += venta.cantidad;
      });
      return ventasPorCategoria;
    } catch (error) {
      throw error;
    }
  }

  async registrarVentaConStock(ventaData: any) {
    try {
      const { data: producto, error: errorProducto } = await this.supabase
        .from('productos')
        .select('stock, nombre')
        .eq('id', ventaData.producto_id)
        .single();

      if (errorProducto || !producto) throw new Error('Producto no existe');
      if (producto.stock < ventaData.cantidad) throw new Error(`Stock insuficiente.`);

      const { data: venta, error: errorVenta } = await this.supabase
        .from('ventas')
        .insert([{
          producto_id: ventaData.producto_id,
          cantidad: ventaData.cantidad,
          total: ventaData.total,
          metodo_pago: ventaData.metodo_pago,
          usuario_id: ventaData.usuario_id, 
          fecha: new Date().toISOString()
        }])
        .select()
        .single();

      if (errorVenta) throw new Error(`Error al registrar venta`);

      const nuevoStock = producto.stock - ventaData.cantidad;
      await this.supabase.from('productos').update({ stock: nuevoStock }).eq('id', ventaData.producto_id);
      
      return venta;
    } catch (error) {
      throw error;
    }
  }

  // =================== REALTIME ===================
  suscribirCambiosVentas(callback: (payload: any) => void) {
    return this.supabase.channel('cambios-ventas-directo')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas' }, callback)
      .subscribe();
  }

  suscribirCambiosProductos(callback: (payload: any) => void) {
    return this.supabase.channel('cambios-productos-directo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos' }, callback)
      .subscribe();
  }

  suscribirCambiosEmpleados(callback: (payload: any) => void) {
    return this.supabase.channel('cambios-empleados-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, callback)
      .subscribe();
  }

  // =================== PEDIDOS ESPECIALES ===================
  async getPedidos() {
    const { data, error } = await this.supabase
      .from('pedidos')
      .select('*')
      .order('fecha_entrega', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async crearPedido(pedido: any) {
    const { Tipo, nombre, telefono, fecha, lugar, estado, ...detalles } = pedido;

    const { data, error } = await this.supabase
      .from('pedidos')
      .insert({
        tipo: Tipo,
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        fecha_entrega: fecha,
        lugar_entrega: lugar,
        estado: estado || 'en proceso',
        detalles: detalles 
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEstadoPedido(id: string, nuevoEstado: string) {
    const { error } = await this.supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) throw error;
  }

  // =================== BUZÓN DE PETICIONES (STOCK/CAMBIOS) ===================

  async crearSolicitud(datos: Solicitud) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('No hay usuario autenticado');

    const { error } = await this.supabase.from('peticiones').insert({
      empleado_id: user.id,
      tipo: datos.tipo,
      producto_id: datos.producto_id || null,
      producto_nombre: datos.producto_nombre,
      cantidad: datos.cantidad || 0,
      nota: datos.nota
    });
    if (error) throw error;
  }

  async getPeticionesStock(estado: 'pendiente' | 'completado' | 'rechazado' | 'todas' = 'pendiente') {
    let query = this.supabase
      .from('peticiones')
      .select(`*, empleado:perfiles!empleado_id (username, email)`)
      .order('creado_en', { ascending: false });

    if (estado !== 'todas') {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async actualizarEstadoPeticion(id: string, nuevoEstado: 'completado' | 'rechazado') {
    const { error } = await this.supabase
      .from('peticiones')
      .update({ estado: nuevoEstado, actualizado_en: new Date() })
      .eq('id', id);
    if (error) throw error;
  }

 // =================== CORTES DE CAJA ===================
async realizarCorteCaja(corteData: any) {
  // Obtener la sesión actual
  const { data: { session } } = await this.supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
  }

  const { data, error } = await this.supabase
    .from('cortes_caja')
    .insert({
      usuario_id: session.user.id,
      ...corteData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async getCortesCajaRecientes() {
  const { data, error } = await this.supabase
    .from('cortes_caja')
    .select(`
      *,
      usuario:perfiles!usuario_id (username, email)
    `)
    .order('fecha_corte', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

async getVentasParaCorte(fecha: Date) {
  const dia = new Date(fecha);
  const inicioDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
  const finDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();

  const { data, error } = await this.supabase
    .from('ventas')
    .select('total, metodo_pago')
    .gte('fecha', inicioDelDia)
    .lte('fecha', finDelDia);

  if (error) throw error;
  return data || [];
}


}