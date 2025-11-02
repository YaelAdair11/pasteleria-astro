import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Empleado } from '../../models/empleado.model';

@Component({
  selector: 'app-empleados',
  imports: [CommonModule],
  templateUrl: './empleados.html',
  styleUrl: './empleados.css',
})
export class Empleados {
  empleados: Empleado[] = [];

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.empleados = await this.supabase.getEmpleados();
  }
}
