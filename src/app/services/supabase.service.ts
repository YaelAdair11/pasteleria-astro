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
          detectSessionInUrl: true,
        },
      }
    );
    this.initUser();
  }

  // Inicializa el BehaviorSubject al cargar la app
  private async initUser() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      const usuario = await this.getUsuarioCompleto(session.user.id);
      this.userSubject.next(usuario);
    }

    // Escucha cambios de auth (login/logout)
    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const usuario = await this.getUsuarioCompleto(session.user.id);
        this.userSubject.next(usuario);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  // Obtener todos los datos completos del usuario
  private async getUsuarioCompleto(userId: string): Promise<UsuarioCompleto> {
    // Obtener perfil
    const { data: perfil, error } = await this.supabase
      .from('perfiles')
      .select('username, rol, avatar, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('No se encontró perfil, usando datos de Auth', error);
    }

    // Obtener datos de Auth
    const { data: sessionData } = await this.supabase.auth.getUser();
    const userAuth = sessionData?.user;

    return {
      ...(userAuth as User),
      id: userAuth?.id ?? userId,
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
  async getEmpleados(): Promise<Empleado[]> {
    // Consulta la tabla perfiles (o la que tengas)
    const { data, error } = await this.supabase
      .from('perfiles')
      .select('id, username, email, avatar, rol')
      .eq('rol', 'empleado') // 🔹 solo empleados
      .order('username', { ascending: true });

    if (error) throw error;
    return data ?? [];
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


}
