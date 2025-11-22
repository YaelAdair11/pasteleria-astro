import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Importar ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { filter, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './update-password.html',
  styleUrls: ['./update-password.css']
})
export class UpdatePassword {
  form: FormGroup;
  loading = false;
  
  // Estados para controlar la vista
  verificando = true; 
  linkValido = false; 
  error: string | null = null;
  mensajeExito: string | null = null; // ✅ Nuevo estado para el mensaje de éxito
  
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
    this.supabase.ready$.pipe(
      filter(isReady => isReady === true),
      switchMap(() => this.supabase.user$),
      take(1) 
    ).subscribe(user => {
      this.verificando = false;
      if (user) {
        console.log('Sesión recuperada para:', user.email);
        this.linkValido = true;
      } else {
        console.error('No hay sesión activa.');
        this.linkValido = false;
        this.error = 'El enlace de recuperación ha expirado o no es válido. Por favor solicita uno nuevo.';
      }
    });
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = null;
    this.mensajeExito = null; // Limpiamos mensajes previos
    const { password } = this.form.value;

    try {
      const { error } = await this.supabase.updateUserPassword(password);
      
      if (error) throw error;

      // ✅ En lugar de alert, mostramos el mensaje en la UI
      this.mensajeExito = 'Tu contraseña ha sido actualizada correctamente.';
      
      // Esperamos 2 segundos antes de redirigir para que el usuario lea el mensaje
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2500);

    } catch (err: any) {
      console.error('Error:', err);
      this.error = err.message || 'Error al actualizar. Intenta solicitar un nuevo correo.';
      this.loading = false; // Solo quitamos loading si hay error
    }
    // Nota: No ponemos loading = false en finally si hay éxito, para evitar que el formulario se reactive antes de redirigir.
  }
}