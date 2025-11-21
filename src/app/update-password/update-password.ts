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
export class UpdatePassword implements OnInit {
  form: FormGroup;
  loading = false;
  verificandoSesion = true;
  usuarioValido = false;
  error: string | null = null;
  passwordVisible = false;

  constructor(
    private fb: FormBuilder, 
    private supabase: SupabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef // 2. Inyectar ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
    
    this.form.disable();
  }

  ngOnInit() {
    console.log('Iniciando verificación de sesión...');
    
    this.supabase.ready$.pipe(
      filter(isReady => isReady),
      switchMap(() => this.supabase.user$),
      take(1)
    ).subscribe(user => {
      this.verificandoSesion = false;

      if (!user) {
        console.error('No se encontró usuario autenticado.');
        this.error = 'El enlace ha expirado o no es válido. Solicita uno nuevo.';
        this.usuarioValido = false;
        this.form.disable();
      } else {
        console.log('Usuario verificado:', user.email);
        this.usuarioValido = true;
        this.error = null;
        this.form.enable();
      }
      // Forzamos actualización de la vista al terminar la verificación inicial
      this.cdr.detectChanges();
    });
  }

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
    if (this.form.invalid) return;

    console.log('Enviando nueva contraseña a Supabase...');
    this.loading = true;
    this.error = null;
    const { password } = this.form.value;

    try {
      // 1. Creamos una promesa que falla automáticamente después de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Por favor recarga la página (F5) e intenta de nuevo.')), 10000)
      );

      // 2. Ejecutamos la actualización compitiendo contra el timeout
      const updatePromise = this.supabase.updateUserPassword(password);
      
      // Promise.race devuelve el resultado de la promesa que termine primero
      const result: any = await Promise.race([updatePromise, timeoutPromise]);
      
      const { error } = result;
      if (error) throw error;

      console.log('Contraseña actualizada correctamente.');
      alert('Tu contraseña ha sido actualizada. Por favor inicia sesión.');
      this.router.navigate(['/login']); 

    } catch (err: any) {
      console.error('Error en updatePassword:', err);
      this.error = err.message || 'Ocurrió un error al actualizar la contraseña.';
      
      // Si el error es por el bloqueo, sugerimos recargar
      if (err.message?.includes('Tiempo de espera')) {
        alert('Parece que el navegador bloqueó la solicitud. Recarga la página (F5) y funcionará.');
      }

    } finally {
      console.log('Finalizando proceso de carga.');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}