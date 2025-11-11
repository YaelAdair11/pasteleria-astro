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
    // (Este es tu código, está perfecto)
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, username, email, avatar, rol')
      .eq('rol', 'empleado') // 🔹 solo empleados
      .order('username', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  // función para crear un nuevo empleado ---
  async crearEmpleado(empleadoData: any) {
    // Esta es la lógica que te faltaba.
    // 1. Creamos el usuario en Supabase AUTH
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: empleadoData.email,
      password: empleadoData.password,
      options: {
        // 2. Le pasamos los datos extra (username y rol)
        // que Supabase copiará automáticamente a la tabla 'perfiles'
        data: {
          username: empleadoData.username,
          rol: 'empleado' // Forzamos el rol a 'empleado'
        }
      }
    });

    if (authError) {
      return { data: null, error: authError }; // Devolvemos el error
    }

    // 3. Si salió bien, leemos el perfil que se acaba de crear para devolverlo
    if (authData.user) {
      const { data: perfilData, error: perfilError } = await this.supabase
        .from('perfiles')
        .select('id, username, email, avatar, rol')
        .eq('id', authData.user.id)
        .single(); // .single() nos trae solo 1 objeto

      return { data: [perfilData], error: perfilError }; // Devolvemos el nuevo empleado
    }

    return { data: null, error: new Error('No se pudo crear el usuario') };
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

