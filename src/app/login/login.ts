import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink, ɵEmptyOutletComponent } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
  
  mostrarLogin2() {
    const test = document.getElementById('test') as HTMLElement;
    if (test) {
      test.classList.add('active');
    }
  }
  mostrarLogin(event: MouseEvent) {
    const mask = document.getElementById('mask');
    const button = event.currentTarget as HTMLElement;

    if (!mask || !button) return;

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const xPercent = (x / window.innerWidth) * 100;
    const yPercent = (y / window.innerHeight) * 100;

    // 1️⃣ Aplicar posición a la máscara ANTES de animar
    mask.style.setProperty('--x', `${xPercent}%`);
    mask.style.setProperty('--y', `${yPercent}%`);

    // 2️⃣ Desactivar animación para establecer clip inicial
    mask.style.transition = 'none';
    mask.classList.remove('active');

    // 3️⃣ Forzar un reflow REAL (no solo bounding box)
    void mask.offsetWidth;

    // 4️⃣ Reactivar la transición DESPUÉS del reflow
    mask.style.transition = 'clip-path 0.6s ease-in-out';

    // 5️⃣ Ahora sí activar animación en el siguiente frame real
    requestAnimationFrame(() => {
      mask.classList.add('active');
    });
  }


  toggleLogin() {
    const mask = document.getElementById('mask');
    if (mask) {
      mask.classList.remove('active');
    }
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

    const { login, password } = this.form.value;

    try {
      const { error } = await this.supabase.signInWithEmailOrUsername(login, password);
      if (error) {
        this.error = error.message;
        return;
      }

      // 🔥 Escuchar el BehaviorSubject (solo 1 vez)
      const sub = this.supabase.user$.subscribe((user) => {
        if (!user) return;

        switch (user.rol) {
          case 'admin':
            this.router.navigate(['/admin']);
            break;
          case 'empleado':
            this.router.navigate(['/empleado']);
            break;
          default:
            this.error = 'Rol desconocido';
        }

        sub.unsubscribe();
      });

    } catch (e: any) {
      this.error = e?.message ?? 'Error inesperado';
    } finally {
      this.loading = false;
    }
  }
}
