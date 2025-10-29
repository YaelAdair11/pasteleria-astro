import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

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
  }

  // =================== AUTH ===================
  async signInWithEmailOrUsername(login: string, password: string) {
    // Buscar en perfiles por username o email
    const { data: perfil, error } = await this.supabase
      .from('perfiles')
      .select('email')
      .or(`username.eq.${login},email.eq.${login}`)
      .single();

    if (error || !perfil) throw new Error('Usuario no encontrado');

    // Autenticar con email de Auth
    return this.supabase.auth.signInWithPassword({
      email: perfil.email,
      password,
    });
  }

  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // Obtener nombre de usuario para mostrar
  async getNombreUsuario(): Promise<string> {
    const session = await this.getSession();
    if (!session || !session.user) return '';
    const user = session.user;
    // Tomamos username de user_metadata o email como fallback
    return user.user_metadata?.['username'] || user.email || 'Usuario';
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
  getProductos() {
    return this.supabase.from('productos').select('*');
  }

  insertProducto(payload: any) {
    return this.supabase.from('productos').insert(payload);
  }

}
