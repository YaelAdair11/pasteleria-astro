import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  form: FormGroup;
  loading = false;
  mensajeExito: string | null = null;
  error: string | null = null;

  constructor(private fb: FormBuilder, private supabase: SupabaseService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.mensajeExito = null;

    const { email } = this.form.value;
    
    try {
      // Llamamos al servicio para enviar el correo
      const { error } = await this.supabase.resetPasswordForEmail(email);
      
      if (error) throw error;
      
      this.mensajeExito = '¡Correo enviado! Revisa tu bandeja de entrada (y spam) para continuar.';
      this.form.disable(); // Deshabilitamos el formulario para evitar múltiples envíos
    } catch (err: any) {
      console.error(err);
      // Mensaje amigable si falla
      this.error = err.message || 'Ocurrió un error al intentar enviar el correo.';
    } finally {
      this.loading = false;
    }
  }
}
