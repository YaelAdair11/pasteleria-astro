import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Empleado } from '../../models/empleado.model';

interface DiaSemana {
  num: number;
  nombre: string;
}

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
  // --- Empleados ---
  empleados: Empleado[] = [];
  mostrarFormulario = false;
  modoEdicion = false;
  formDatos: any = {};
  errorMensaje: string | null = null;

  // -- Propiedades para la Agenda ---
  
  // Lista de días (ahora con número para la DB)
  diasSemana: DiaSemana[] = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miércoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sábado' },
    { num: 7, nombre: 'Domingo' }
  ];
  
  // Objeto que tendrá los datos de la agenda (¡ahora usa dia.num!)
  // Ej: { 'id-empleado-1': { 1: 'Apertura 9-5' } }
  agenda: { [empleadoId: string]: { [dia_num: number]: string } } = {};

  // --- Propiedades para el Modal de la Agenda ---
  mostrarModalAgenda = false;
  modalDatos: any = {
    empleado: null,
    dia: null, // Ahora será un objeto DiaSemana
    tarea: ''
  };

  // --- Alerta de éxito (Toast) ---
  alertaExito: string | null = null;
  private alertaTimeout: any = null;


  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    // Cargamos empleados y lUEGO la agenda
    await this.cargarEmpleados();
    await this.cargarAgenda();
  }

  // --- Funciones de carga separadas ---
  async cargarEmpleados() {
    try {
      this.empleados = await this.supabase.getEmpleados();
    } catch (error: any) {
      alert('Error cargando empleados: ' + error.message);
    }
  }

  async cargarAgenda() {
    // 1. Reinicia e inicializa la agenda local
    // Esto es VITAL para que el HTML pueda hacer data-binding
    this.agenda = {};
    this.empleados.forEach(emp => {
      this.agenda[emp.id] = {}; // Inicializa un objeto vacío para cada empleado
    });

    // 2. Carga los turnos guardados desde Supabase
    try {
      const turnosGuardados = await this.supabase.getAgendaSemanal();

      // 3. Mapea los turnos al objeto 'agenda' local
      turnosGuardados.forEach(turno => {
        // Solo agrega el turno si el empleado todavía existe
        if (this.agenda[turno.empleado_id]) {
          this.agenda[turno.empleado_id][turno.dia_semana] = turno.tarea;
        }
      });
      console.log('Agenda cargada:', this.agenda);

    } catch (error: any) {
      alert('Error cargando la agenda: ' + error.message);
    }
  }


  // --- Métodos del Formulario de Empleados (sin cambios) ---
  abrirFormularioNuevo() {
    this.modoEdicion = false;
    this.errorMensaje = null;
    this.formDatos = {
      username: '',
      email: '',
      password: '',
      rol: 'empleado'
    };
    this.mostrarFormulario = true;
  }

  abrirFormularioEditar(empleado: Empleado) {
    this.modoEdicion = true;
    this.errorMensaje = null;
    this.formDatos = { ...empleado };
    this.mostrarFormulario = true;
  }

  cancelarFormulario() {
    this.mostrarFormulario = false;
    this.errorMensaje = null;
  }

  async onFormularioSubmit() {
    this.errorMensaje = null;
    
    if (!this.modoEdicion) {
      const email = this.formDatos.email.toLowerCase();
      const emailValido = email.endsWith('@gmail.com') ||
                          email.endsWith('@hotmail.com') ||
                          email.endsWith('@outlook.com') ||
                          email.endsWith('@live.com.mx') ||
                          email.endsWith('@uv.mx');
      
      if (!emailValido) {
        this.errorMensaje = 'Error: El email debe ser @gmail.com, @hotmail.com, @outlook.com o @uv.mx.';
        return;
      }
      if (this.formDatos.password.length < 6) {
        this.errorMensaje = 'Error: La contraseña debe tener mínimo 6 caracteres.';
        return;
      }
    }
    
    if (this.modoEdicion) {
      await this.actualizarEmpleado();
    } else {
      await this.crearNuevoEmpleado();
    }
  }

  async crearNuevoEmpleado() {
    try {
      const { data, error } = await this.supabase.crearEmpleado(this.formDatos);
      if (error) throw error;
      
      if (data) {
        this.empleados.push(data[0] as Empleado);
        // Inicializa la agenda para el nuevo empleado
        this.agenda[data[0].id] = {};
      }
      
      this.mostrarAlertaExito('¡Empleado guardado!');
      this.mostrarFormulario = false;

    } catch (error: any) {
      console.error('Error al guardar empleado:', error);
      this.errorMensaje = 'ERROR: No se pudo guardar. ' + error.message;
    }
  }

  async actualizarEmpleado() {
    try {
      const { data, error } = await this.supabase.updateEmpleado(
        this.formDatos.id,
        this.formDatos
      );
      if (error) throw error;
      
      const index = this.empleados.findIndex(emp => emp.id === this.formDatos.id);
      if (index !== -1 && data) {
        this.empleados[index] = data as Empleado;
      }
      
      this.mostrarAlertaExito('¡Empleado actualizado!');
      this.mostrarFormulario = false;

    } catch (error: any) {
      console.error('Error al actualizar empleado:', error);
      this.errorMensaje = 'ERROR: No se pudo actualizar. ' + error.message;
    }
  }

  async onBorrarClick(id: string, username: string) {
    const confirmado = confirm(`¿Estás segura que quieres borrar a ${username}?`);
    if (!confirmado) return;

    try {
      const { error } = await this.supabase.borrarEmpleado(id);
      if (error) throw error;
      
      this.mostrarAlertaExito('¡Empleado borrado!');
      this.empleados = this.empleados.filter(emp => emp.id !== id);
      // También borramos sus datos de la agenda local
      delete this.agenda[id];
      // (La DB lo borra en cascada gracias al "ON DELETE CASCADE")

    } catch (error: any) {
      console.error('Error al borrar empleado:', error);
      alert('ERROR: No se pudo borrar.\n' + error.message);
    }
  }

  // --- Métodos para controlar la Agenda ---

  /**
   * Abre el modal para asignar una tarea
   * @param empleado El objeto Empleado
   * @param dia El objeto DiaSemana (ej. {num: 1, nombre: 'Lunes'})
   */
  abrirModalAgenda(empleado: Empleado, dia: DiaSemana) {
    // Busca si ya existe una tarea para cargarla en el modal
    const tareaExistente = (this.agenda[empleado.id] && this.agenda[empleado.id][dia.num])
      ? this.agenda[empleado.id][dia.num]
      : '';
    
    this.modalDatos = {
      empleado: empleado,
      dia: dia, // Guarda el objeto {num, nombre}
      tarea: tareaExistente
    };
    this.mostrarModalAgenda = true;
  }

  /**
   * Cierra el modal de la agenda
   */
  cerrarModalAgenda() {
    this.mostrarModalAgenda = false;
    this.modalDatos = { empleado: null, dia: null, tarea: '' };
  }

  /**
   * ¡ACTUALIZADO! Guarda el turno en Supabase y actualiza la UI
   */
  async guardarAgendaItem() {
    const { empleado, dia, tarea } = this.modalDatos;
    if (!empleado || !dia) return;

    try {
      // 1. Llama a Supabase para guardar (insertar, actualizar O borrar si está vacío)
      await this.supabase.upsertTurno(empleado.id, dia.num, tarea);

      // 2. Actualiza el objeto local 'agenda'
      if (tarea && tarea.trim() !== '') {
        this.agenda[empleado.id][dia.num] = tarea.trim();
        this.mostrarAlertaExito('¡Turno guardado!');
      } else {
        // Si la tarea se guardó vacía, la borramos localmente
        delete this.agenda[empleado.id][dia.num];
        this.mostrarAlertaExito('¡Turno borrado!');
      }

      // 3. Cierra el modal
      this.cerrarModalAgenda();

    } catch (error: any) {
      alert('Error al guardar el turno: ' + error.message);
    }
  }

  /**
   *  Borra el turno de Supabase y de la UI
   * (Se activa con la 'x' roja)
   */
  async borrarAgendaItem(empleadoId: string, diaNum: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation(); // Evita que se abra el modal
    }
    
    // Confimación
    const confirmado = confirm('¿Borrar este turno?');
    if (!confirmado) return;

    try {
      // 1. Llama a Supabase para borrar
      await this.supabase.borrarTurno(empleadoId, diaNum);

      // 2. Actualiza el objeto local
      if (this.agenda[empleadoId] && this.agenda[empleadoId][diaNum]) {
        delete this.agenda[empleadoId][diaNum];
      }
      
      // 3. Muestra alerta
      this.mostrarAlertaExito('¡Turno borrado!');

    } catch (error: any) {
      alert('Error al borrar el turno: ' + error.message);
    }
  }

  // --- Utilidad para mostrar alertas (Toast) ---
  mostrarAlertaExito(mensaje: string) {
    // Si ya hay una alerta, la limpia primero
    if (this.alertaTimeout) {
      clearTimeout(this.alertaTimeout);
    }
    
    this.alertaExito = mensaje;

    // La oculta después de 3 segundos
    this.alertaTimeout = setTimeout(() => {
      this.alertaExito = null;
      this.alertaTimeout = null;
    }, 3000);
  }
}