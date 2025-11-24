import { ChangeDetectorRef, Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

declare var bootstrap: any;

@Component({
  selector: 'app-buzon',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buzon.html',
  styleUrl: './buzon.css',
})
export class Buzon {
  peticiones: any[] = [];
  procesando = false;
  filtroActual: 'pendiente' | 'historial' = 'pendiente';
  
  modalMensaje!: any;
  mensajeTitulo: string = '';
  mensajeCuerpo: string = '';
  mensajeTipo: 'success' | 'error' = 'success';

  modalConfirmar!: any;
  peticionSeleccionada: any = null;
  estadoSeleccionado: 'completado' | 'rechazado' | null = null;
  mensajeAccion: string = '';

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarPeticiones();
  }

  ngAfterViewInit() {
    const elMensaje = document.getElementById('modalMensaje');
    if (elMensaje) {
      this.modalMensaje = new bootstrap.Modal(elMensaje);
    }

    const elConfirmar = document.getElementById('modalConfirmar');
    if (elConfirmar) {
      this.modalConfirmar = new bootstrap.Modal(elConfirmar);
    }
  }

  mostrarMensaje(titulo: string, cuerpo: string, tipo: 'success' | 'error') {
    this.mensajeTitulo = titulo;
    this.mensajeCuerpo = cuerpo;
    this.mensajeTipo = tipo;
    this.modalMensaje.show();
  }

  cambiarFiltro(filtro: 'pendiente' | 'historial') {
    this.filtroActual = filtro;
    this.cargarPeticiones();
  }

  async cargarPeticiones() {
    this.procesando = true;
    this.cdr.detectChanges();

    try {
      const estadoSolicitado = this.filtroActual === 'pendiente' ? 'pendiente' : 'todas';
      const data = await this.supabase.getPeticionesStock(estadoSolicitado);
      
      if (this.filtroActual === 'historial') {
        this.peticiones = data.filter((p: any) => p.estado !== 'pendiente');
      } else {
        this.peticiones = data;
      }
    } catch (error) {
      console.error('Error cargando peticiones:', error);
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
    }
  }

  // Helper para el texto del botón según el tipo de solicitud
  getTextoBoton(tipo: string): string {
    switch (tipo) {
      case 'stock': return 'Surtido';
      case 'nuevo_producto': return 'Creado';
      case 'editar_producto': return 'Corregido';
      case 'nueva_categoria': return 'Agregada';
      default: return 'Hecho';
    }
  }

  // Paso 1: Preparar y abrir el modal
  resolver(peticion: any, estado: 'completado' | 'rechazado') {
    this.peticionSeleccionada = peticion;
    this.estadoSeleccionado = estado;

    // Construimos el mensaje para el modal
    if (estado === 'rechazado') {
      this.mensajeAccion = 'RECHAZAR esta solicitud';
    } else {
      switch (peticion.tipo) {
        case 'stock': this.mensajeAccion = 'marcar como SURTIDO (Stock actualizado)'; break;
        case 'nuevo_producto': this.mensajeAccion = 'confirmar que el PRODUCTO FUE CREADO'; break;
        case 'editar_producto': this.mensajeAccion = 'confirmar que los DATOS FUERON CORREGIDOS'; break;
        default: this.mensajeAccion = 'marcar como COMPLETADO'; break;
      }
    }

    this.modalConfirmar.show();
  }

  // Paso 2: Ejecutar la acción al confirmar en el modal
  async confirmarResolucion() {
    if (!this.peticionSeleccionada || !this.estadoSeleccionado) return;

    this.procesando = true;
    this.cdr.detectChanges();

    try {
      await this.supabase.actualizarEstadoPeticion(this.peticionSeleccionada.id, this.estadoSeleccionado);
      
      // Éxito: Cerramos modal y recargamos
      this.modalConfirmar.hide();
      this.peticionSeleccionada = null;
      this.estadoSeleccionado = null;
      
      await this.cargarPeticiones();
      
      this.mostrarMensaje('¡Listo!', 'La solicitud ha sido actualizada correctamente.', 'success');
      
    } catch (error) {
      console.error('Error al actualizar:', error);
      this.mostrarMensaje('Error', 'No se pudo actualizar la solicitud.', 'error');
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
    }
  }
}
