import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Importamos el servicio centralizado
import { SupabaseService } from '../../services/supabase.service'; 

// Interfaz para definir la estructura de los datos de ventas
interface Venta {
  id: string;
  cantidad: number;
  metodo_pago: string;
  total: number;
  fecha: string;
  productos: {
    nombre: string;
  }[]; // Espera un arreglo de productos
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class Ventas implements OnInit {
  filtro: string = '';
  ventas: Venta[] = [];
  loading: boolean = true;
  error: string | null = null;

  // 1. Inyectamos el SupabaseService en el constructor
  constructor(private supabaseService: SupabaseService) {}

  // 2. Al iniciar el componente, llamamos a loadVentas
  ngOnInit(): void {
    this.loadVentas();
  }

  /**
   * Carga las ventas llamando al método getVentas() del servicio.
   */
  async loadVentas(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // 3. Ya no usamos createClient, llamamos al método del servicio
      const data = await this.supabaseService.getVentas(this.filtro);
      
      // Hacemos un 'cast' para que TypeScript sepa que 'data' es un arreglo de 'Venta'
      this.ventas = data as Venta[];
      
    } catch (error: any) {
      console.error('Error al cargar ventas:', error);
      this.error = error.message || 'No se pudieron cargar las ventas.';
      this.ventas = [];
    }

    this.loading = false; // Terminamos la carga
  }

  /**
   * Calcula el total de las ventas mostradas.
   * Esta lógica se queda en el componente, ya que solo afecta a la vista.
   */
  totalVentas(): number {
    // Usamos (this.ventas || []) por seguridad, si ventas fuera nulo
    return (this.ventas || []).reduce((acc, v) => acc + v.total, 0);
  }
}