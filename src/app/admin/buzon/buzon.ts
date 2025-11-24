import { ChangeDetectorRef, Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-buzon',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './buzon.html',
  styleUrl: './buzon.css',
})
export class Buzon {
  peticiones: any[] = [];
  loading = false;
  filtroActual: 'pendiente' | 'historial' = 'pendiente';

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarPeticiones();
  }

  cambiarFiltro(filtro: 'pendiente' | 'historial') {
    this.filtroActual = filtro;
    this.cargarPeticiones();
  }

  async cargarPeticiones() {
    this.loading = true;
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
      this.loading = false;
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

  async resolver(peticion: any, estado: 'completado' | 'rechazado') {
    // Personalizamos el mensaje de confirmación
    let mensajeAccion = '';
    if (estado === 'rechazado') {
      mensajeAccion = 'RECHAZAR esta solicitud';
    } else {
      // Mensaje positivo personalizado
      switch (peticion.tipo) {
        case 'stock': mensajeAccion = 'marcar como SURTIDO (Stock actualizado)'; break;
        case 'nuevo_producto': mensajeAccion = 'confirmar que el PRODUCTO FUE CREADO'; break;
        case 'editar_producto': mensajeAccion = 'confirmar que los DATOS FUERON CORREGIDOS'; break;
        default: mensajeAccion = 'marcar como COMPLETADO'; break;
      }
    }

    if (!confirm(`¿Estás seguro de ${mensajeAccion}?`)) return;
    
    this.loading = true; 
    this.cdr.detectChanges();

    try {
      await this.supabase.actualizarEstadoPeticion(peticion.id, estado);
      
      // NOTA: Aquí podrías automatizar acciones futuras (ej. si es stock, sumar al inventario automáticamente)
      // Por ahora, es un flujo de gestión manual/visual.
      
      await this.cargarPeticiones(); 
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('Ocurrió un error al intentar actualizar la solicitud.');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
