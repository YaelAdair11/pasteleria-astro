import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { filter, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-update-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-password.html',
  styleUrl: './update-password.css',
})
export class UpdatePassword implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  passwordVisible = false;

  constructor(
    private fb: FormBuilder, 
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // ✅ SOLUCIÓN: Esperar a que Supabase termine de inicializar
    this.supabase.ready$.pipe(
      filter(isReady => isReady), // 1. Esperamos a que ready$ sea true
      switchMap(() => this.supabase.user$), // 2. Cambiamos al observable del usuario
      take(1) // 3. Tomamos solo el primer valor válido
    ).subscribe(user => {
      if (!user) {
        // Solo mostramos el error si Supabase ya terminó de cargar Y no hay usuario
        this.error = 'El enlace ha expirado o no es válido. Por favor solicita uno nuevo.';
      } else {
        // Si hay usuario, limpiamos cualquier error previo
        this.error = null;
      }
    });
  }

  // ... (Resto del código: passwordMatchValidator, toggle, onSubmit... igual que antes)
  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      return null;
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    const { password } = this.form.value;

    try {
      const { error } = await this.supabase.updateUserPassword(password);
      
      if (error) throw error;

      alert('Tu contraseña ha sido actualizada correctamente.');
      this.router.navigate(['/login']); 

    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'Ocurrió un error al actualizar la contraseña.';
    } finally {
      this.loading = false;
    }
  }
}