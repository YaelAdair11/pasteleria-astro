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
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  togglePassword() {
    const input = document.getElementById('password') as HTMLInputElement;
    // cambiar icono
    const icon = document.getElementById('password-icon') as HTMLElement;
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.add('fa-eye');
      icon.classList.remove('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.add('fa-eye-slash');
      icon.classList.remove('fa-eye');
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const { login, password } = this.form.getRawValue();

    console.log('Intentando iniciar sesión con:', login);

    try {
      // Iniciar sesión con email o username
      const { data, error } = await this.supabase.signInWithEmailOrUsername(login, password);
      if (error) {
        this.error = error.message;
        this.loading = false;
        return;
      }

      // Obtener usuario completo del BehaviorSubject
      const user = await this.supabase.getSession();
      const currentUser = await (this.supabase as any).getUsuarioCompleto(user?.user?.id!);

      // Redirigir según rol
      switch (currentUser.rol) {
        case 'admin':
          this.router.navigate(['/admin']);
          break;
        case 'empleado':
          this.router.navigate(['/empleado']);
          break;
        default:
          this.error = 'Rol desconocido';
      }

    } catch (err: any) {
      this.error = err?.message || 'Ocurrió un error inesperado.';
    } finally {
      this.loading = false;
    }
  }
}
