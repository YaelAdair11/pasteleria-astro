import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstadoVentasService {
  private ventasActualizadas = new BehaviorSubject<boolean>(false);
  ventasActualizadas$ = this.ventasActualizadas.asObservable();

  notificarActualizacionVentas(): void {
    console.log('🔄 Notificando actualización de ventas a todos los componentes...');
    this.ventasActualizadas.next(true);
  }
}