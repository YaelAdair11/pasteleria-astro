import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Empleado } from '../models/empleado.model';
import { Usuario } from '../models/usuario.model';

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

  // =================== DB ===================

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

    // Hacemos un UPDATE en la tabla 'perfiles'
    // Por ahora, solo dejamos que actualice el 'username' y 'rol'
    const { data, error } = await this.supabase
      .from('perfiles')
      .update({ 
        username: empleadoData.username,
        rol: empleadoData.rol
      })
      .eq('id', id) // Donde el 'id' coincida
      .select('id, username, email, avatar, rol') // Devuelve el perfil actualizado
      .single();

    if (error) {
      console.error("Error en update:", error.message);
      return { data: null, error: error };
    }
    
    return { data: data, error: null }; // Devuelve el empleado actualizado
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
    
    // Si la tarea viene vacía o nula, lo mejor es borrar el registro.
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
        onConflict: 'empleado_id, dia_semana' // La llave primaria que definimos
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
  async getProductos(admin = false) {
  let query = this.supabase
    .from('productos')
    .select(`
      *,
      categorias (
        id,
        nombre
      )
    `)
    .order('nombre', { ascending: true });

    // Solo filtrar los activos si NO es admin
     if (!admin) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async addProducto(producto: any) {
    const { data, error } = await this.supabase.from('productos').insert(producto).select().single();
    if (error) throw error;
    return data;
  }

  async updateProducto(id: string, cambios: any) {
    const { data, error } = await this.supabase.from('productos').update(cambios).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteProducto(id: string) {
    const { error } = await this.supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadImagenProducto(file: File): Promise<string> {
    
    // 1. Definir el nombre del bucket (¡asegúrate que exista en tu Supabase!)
    const BUCKET_NAME = 'productos';

    // 2. Crear un nombre de archivo único (ej. 'pastel-172348392.png')
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // Puedes añadir carpetas ej. 'public/${fileName}'

    // 3. Subir el archivo
    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600', // Cache de 1 hora
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      throw uploadError;
    }

    // 4. Obtener la URL pública
    const { data } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error('No se pudo obtener la URL pública.');
    }

    return data.publicUrl;
  }

  async deleteImagenProducto(publicUrl: string | null | undefined): Promise<void> {
    
    // 1. Si no hay URL, no hay nada que borrar.
    if (!publicUrl) {
      console.log('No hay URL pública, no se borra nada.');
      return;
    }

    // 2. Define el nombre de tu bucket
    const BUCKET_NAME = 'productos';
    
    try {
      // 3. Extrae el "path" del archivo desde la URL.
      //    La URL se ve como: .../storage/v1/object/public/productos/12345.png
      //    Necesitamos quedarnos solo con "12345.png"
      const path = publicUrl.split(`/${BUCKET_NAME}/`)[1];
      
      if (!path) {
        console.warn('No se pudo extraer el path del archivo de la URL:', publicUrl);
        return; // No se pudo encontrar el path, no se puede borrar
      }

      // 4. Llama a Supabase Storage para borrar el archivo
      const { error } = await this.supabase.storage
        .from(BUCKET_NAME)
        .remove([path]); // remove() espera un array de paths

      if (error) {
        throw error; // Lanza el error si Supabase falla
      }
      
      console.log('Imagen antigua borrada exitosamente:', path);

    } catch (error) {
      console.error('Error borrando imagen antigua:', error);
      // Opcional: No relanzamos el error para no detener otros procesos,
      // pero sí lo registramos.
    }
  }

  async getCategorias() {
    const { data, error } = await this.supabase
      .from('categorias')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
  }

  async addCategoria(categoria: any) {
    const { data, error } = await this.supabase.from('categorias').insert(categoria).select().single();
    if (error) throw error;
    return data;
  }

  async updateCategoria(id: string, cambios: any) {
    const { data, error } = await this.supabase.from('categorias').update(cambios).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteCategoria(id: string) {
    const { error } = await this.supabase.from('categorias').delete().eq('id', id);
    if (error) throw error;
  }

  // =================== VENTAS ===================
  // ⬇️⬇️⬇️ ESTA ES LA NUEVA FUNCIÓN QUE AÑADIMOS ⬇️⬇️⬇️
  /**
   * Obtiene el historial de ventas, con el nombre del producto relacionado.
   * Puede filtrar por el nombre del producto.
   */
  async getVentas(filtro: string) {

    let query = this.supabase
      .from('ventas')
      // ⬇️⬇️⬇️ ESTA ES LA LÍNEA CORREGIDA ⬇️⬇️⬇️
      .select('id, cantidad, metodo_pago, total, fecha, productos(nombre)')
      // ⬆️⬆️⬆️ Puesta en una sola línea, sin saltos ⬆️⬆️⬆️
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

// Suscribirse a cambios en VENTAS
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
        console.log(' NUEVA VENTA EN TIEMPO REAL:', payload);
        callback(payload);
      }
    )
    .subscribe();
}

// Suscribirse a cambios en PRODUCTOS (para stock)
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
        console.log(' PRODUCTO ACTUALIZADO:', payload);
        callback(payload);
      }
    )
    .subscribe();
}
}

