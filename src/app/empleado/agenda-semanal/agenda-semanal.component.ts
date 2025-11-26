import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Empleado } from '../../models/empleado.model'; // Assuming Empleado model is needed for current user context or type safety
import { Subscription } from 'rxjs'; // Import Subscription

interface DiaSemana {
  num: number;
  nombre: string;
}

@Component({
  selector: 'app-agenda-semanal-empleado',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './agenda-semanal.component.html',
  styleUrls: ['./agenda-semanal.component.css'],
})
export class AgendaSemanalEmpleadoComponent implements OnInit, OnDestroy {
  // Propiedades para la Agenda
  diasSemana: DiaSemana[] = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miércoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sábado' },
    { num: 7, nombre: 'Domingo' }
  ];

  agenda: { [empleadoId: string]: { [dia_num: number]: string } } = {};
  currentEmployeeId: string | null = null;
  currentEmployeeAgenda: { [dia_num: number]: string } = {};
  public Object = Object; // Expose Object to the template

  private userSubscription: Subscription | undefined;
  private agendaChangesSubscription: Subscription | undefined;

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.userSubscription = this.supabase.user$.subscribe(user => {
      if (user && user.id) {
        this.currentEmployeeId = user.id;
        this.loadAgendaForCurrentUser(); // Load agenda when user ID is available
      } else {
        this.currentEmployeeId = null;
        this.currentEmployeeAgenda = {};
      }
    });

    this.agendaChangesSubscription = this.supabase.agendaChanges$.subscribe(() => {
      if (this.currentEmployeeId) {
        this.loadAgendaForCurrentUser();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.agendaChangesSubscription?.unsubscribe();
  }

  async loadAgendaForCurrentUser() {
    if (!this.currentEmployeeId) {
      this.currentEmployeeAgenda = {};
      return;
    }

    try {
      console.log('Cargando agenda para currentEmployeeId:', this.currentEmployeeId);
      const turnosGuardados = await this.supabase.getAgendaSemanal();
      console.log('Turnos guardados recibidos:', turnosGuardados);
      
      this.currentEmployeeAgenda = {};

      turnosGuardados.forEach(turno => {
        console.log(`Comparando turno.empleado_id (${turno.empleado_id}) con currentEmployeeId (${this.currentEmployeeId})`);
        if (turno.empleado_id === this.currentEmployeeId) {
          this.currentEmployeeAgenda[turno.dia_semana] = turno.tarea;
        }
      });
      console.log(`Agenda para empleado ${this.currentEmployeeId}:`, this.currentEmployeeAgenda);

    } catch (error: any) {
      console.error('Error cargando la agenda del empleado:', error.message);
    }
  }

  getTareaForDia(diaNum: number): string {
    return this.currentEmployeeAgenda[diaNum] || 'Día Libre'; // Or any other default message
  }
}
