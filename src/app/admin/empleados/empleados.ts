import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core'; 
import { FormsModule } from '@angular/forms'; // ¡Esto está perfecto!
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
  nuevoEmpleado = {
    username: '',
    email: '',
    password: '', // <-- ¡AÑADIDO! Supabase necesita esto
    rol: 'empleado' // (Lo cambié a 'empleado' para que coincida con tu getEmpleados)
  };

  constructor(private supabase: SupabaseService) {} 

  async ngOnInit() {
    this.empleados = await this.supabase.getEmpleados();
  }

  // guardarEmpleado 
  async guardarEmpleado() {
    console.log('Llamando al servicio para guardar:', this.nuevoEmpleado);
    
    try {
      // 1. Llama a la función que VAMOS a crear en el servicio
      const { data, error } = await this.supabase.crearEmpleado(this.nuevoEmpleado);

      if (error) {
        throw error; // Si falla, nos vamos al 'catch'
      }

      // 2. Si todo sale bien...
      alert('¡Empleado guardado!');
      
      // 3. Añadimos el nuevo empleado a la lista
      // (Asumimos que 'data' es el nuevo empleado)
      if (data) {
        this.empleados.push(data[0] as Empleado); // (Lo forzamos a ser tipo Empleado)
      }
      
      this.mostrarFormulario = false; // Ocultar el formulario
      // Limpiar el formulario
      this.nuevoEmpleado = { username: '', email: '', password: '', rol: 'empleado' };

    } catch (error: any) {
      console.error('Error al guardar empleado:', error);
      alert('Error: ' + error.message);
    }
  }
}