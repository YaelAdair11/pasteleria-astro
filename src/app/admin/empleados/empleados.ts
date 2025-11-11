import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core'; 
import { FormsModule } from '@angular/forms'; 
import { SupabaseService } from '../../services/supabase.service';
import { Empleado } from '../../models/empleado.model';

@Component({
  selector: 'app-empleados',
  standalone: true, 
  imports: [
    CommonModule, 
    FormsModule 
  ],
  templateUrl: './empleados.html',
  styleUrls: ['./empleados.css'],
})
export class Empleados implements OnInit { 
  empleados: Empleado[] = [];
  mostrarFormulario = false; 
  modoEdicion = false; 
  
  formDatos: any = {}; 
  
  // --- ¡NUEVO! Para mostrar los errores de validación ---
  errorMensaje: string | null = null; 

  constructor(private supabase: SupabaseService) {} 

  async ngOnInit() {
    this.empleados = await this.supabase.getEmpleados();
  }

  // --- Abre el formulario en MODO "CREAR" ---
  abrirFormularioNuevo() {
    this.modoEdicion = false;
    this.errorMensaje = null; // Limpia errores
    this.formDatos = { 
      username: '',
      email: '',
      password: '', 
      rol: 'empleado'
    };
    this.mostrarFormulario = true;
  }

  // --- Carga datos y abre el formulario en MODO "EDITAR" ---
  abrirFormularioEditar(empleado: Empleado) {
    this.modoEdicion = true;
    this.errorMensaje = null; // Limpia errores
    this.formDatos = { ...empleado }; 
    this.mostrarFormulario = true;
  }

  // --- Cierra y resetea el formulario ---
  cancelarFormulario() {
    this.mostrarFormulario = false;
    this.errorMensaje = null; // Limpia errores
  }

  // --- Esta función decide si guardar o actualizar ---
  async onFormularioSubmit() {
    this.errorMensaje = null; // Limpia el error anterior
    
    // --- ¡VALIDACIÓN! ---
    if (!this.modoEdicion) { // Solo validamos esto si es un EMPLEADO NUEVO
      
      // 1. Validar Email
      const email = this.formDatos.email.toLowerCase();
      const emailValido = email.endsWith('@gmail.com') || 
                          email.endsWith('@hotmail.com') ||
                          email.endsWith('@outlook.com') ||
                          email.endsWith('@live.com.mx') ||
                          email.endsWith('@uv.mx'); 
                          
      if (!emailValido) {
        this.errorMensaje = 'Error: El email debe ser @gmail.com, @hotmail.com, @outlook.com o @uv.mx.';
        return; // Detiene la función
      }
      
      // 2. Validar Contraseña
      if (this.formDatos.password.length < 6) {
        this.errorMensaje = 'Error: La contraseña debe tener mínimo 6 caracteres.';
        return; // Detiene la función
      }
    }
    // --- FIN DE VALIDACIÓN ---

    // Si pasa la validación, continúa...
    if (this.modoEdicion) {
      await this.actualizarEmpleado();
    } else {
      await this.crearNuevoEmpleado();
    }
  }

  async crearNuevoEmpleado() {
    console.log('Llamando al servicio para guardar:', this.formDatos);
    
    // (Ya no necesitamos la validación aquí, la hicimos arriba)
    
    try {
      const { data, error } = await this.supabase.crearEmpleado(this.formDatos);

      if (error) throw error; 

      alert('¡ÉXITO! Empleado guardado correctamente.'); 
      
      if (data) {
        this.empleados.push(data[0] as Empleado);
      }
      
      this.mostrarFormulario = false; 

    } catch (error: any) {
      console.error('Error al guardar empleado:', error);
      alert('ERROR: No se pudo guardar.\n' + error.message); 
    }
  }

  async actualizarEmpleado() {
    console.log('Llamando al servicio para actualizar:', this.formDatos);

    try {
      const { data, error } = await this.supabase.updateEmpleado(
        this.formDatos.id,
        this.formDatos 
      );

      if (error) throw error;

      alert('¡ÉXITO! Empleado actualizado.');

      const index = this.empleados.findIndex(emp => emp.id === this.formDatos.id);
      if (index !== -1 && data) {
        this.empleados[index] = data as Empleado;
      }
      
      this.mostrarFormulario = false; 

    } catch (error: any) {
      console.error('Error al actualizar empleado:', error);
      alert('ERROR: No se pudo actualizar.\n' + error.message);
    }
  }

  //BORRAR
  async onBorrarClick(id: string, username: string) {
    const confirmado = confirm(`¿Estás segura que quieres borrar a ${username}?`);
    if (!confirmado) return;

    try {
      const { error } = await this.supabase.borrarEmpleado(id);
      if (error) throw error;
      
      alert('¡Empleado borrado con éxito!');
      this.empleados = this.empleados.filter(emp => emp.id !== id);

    } catch (error: any) {
      console.error('Error al borrar empleado:', error);
      alert('ERROR: No se pudo borrar.\n' + error.message);
    }
  }
}