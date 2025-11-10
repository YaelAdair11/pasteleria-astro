import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Empleado } from '../models/empleado.model';

export interface UsuarioCompleto extends User {
  username?: string;
  rol?: string;
  avatar?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  // BehaviorSubject que almacena los datos completos del usuario
  private userSubject = new BehaviorSubject<UsuarioCompleto | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }
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
  private async cargarPerfil(userAuth: User): Promise<UsuarioCompleto> {
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
    } as UsuarioCompleto;
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

  // Obtener el nombre de usuario para mostrar
  getNombreUsuario(): string {
    const user = this.userSubject.value;
    if (!user) return '';
    return user.username || user.email || 'Usuario';
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

  // =================== PRODUCTOS ===================
  async getProductos(admin = false) {
    let query = this.supabase
      .from('productos')
      .select('*')
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

  async getReportesPorDia(fecha: Date) { // 1. Ahora recibe una fecha
    // 2. Usa la fecha recibida, en lugar de 'new Date()'
    const dia = new Date(fecha);
    const inicioDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0).toISOString();
    const finDelDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59).toISOString();

    // 3. La consulta ahora usa las fechas dinámicas
    const { data, error } = await this.supabase
      .from('ventas')
      .select('total')
      .gte('fecha', inicioDelDia)
      .lte('fecha', finDelDia);

    if (error) {
      console.error('Error en getReportesPorDia:', error);
      throw new Error(error.message);
    }

    // 4. La lógica de cálculo es la misma, lo cual es perfecto
    const totalVentas = data.length;
    const totalIngresos = data.reduce((acc, v) => acc + v.total, 0);
    const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;

    return {
      totalIngresos,
      totalVentas,
      ticketPromedio
    };
  }

}

