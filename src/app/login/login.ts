import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'] // Corrige styleUrl → styleUrls
})
export class Login {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.form = this.fb.group({
      login: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    const { login, password } = this.form.getRawValue();

    try {
      const response = await this.supabase.signInWithEmailOrUsername(login, password);

      if (response?.error) {
        this.error = response.error.message;
        return;
      }

      const userId = response.data?.session?.user?.id;
      if (!userId) {
        this.error = 'No se pudo obtener el usuario';
        return;
      }

      const { data: perfil, error: perfilError } = await this.supabase.getRolUsuario(userId);
      if (perfilError || !perfil) {
        this.error = 'No se encontró el perfil del usuario';
        return;
      }

      // Redirigir según rol
      if (perfil.rol === 'admin') this.router.navigate(['/admin']);
      else if (perfil.rol === 'empleado') this.router.navigate(['/empleado']);
      else this.error = 'Rol desconocido';
    } catch (err: any) {
      this.error = err?.message || 'Ocurrió un error inesperado.';
    } finally {
      this.loading = false;
    }
  }
}
