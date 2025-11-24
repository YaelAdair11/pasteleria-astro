import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Producto } from '../../models/producto.model';
import { SupabaseService } from '../../services/supabase.service';
import { Solicitud } from '../../models/solicitud.model';

@Component({
  selector: 'app-peticiones',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './peticiones.html',
  styleUrl: './peticiones.css',
})
export class Peticiones {
  form: FormGroup;
  productos: Producto[] = [];
  misPeticiones: any[] = [];
  loading = false;

  constructor(private fb: FormBuilder, private supabase: SupabaseService) {
    this.form = this.fb.group({
      tipo: ['stock', Validators.required],
      producto_id: [''],
      producto_nombre: [''],
      cantidad: [10],
      nota: ['']
    });
    
    this.configurarValidaciones();
  }

  get tipoActual() { return this.form.get('tipo')?.value; }

  async ngOnInit() {
    this.productos = await this.supabase.getProductos();
    this.cargarMisPeticiones();
  }

  async cargarMisPeticiones() {
    // 'todas' traerá todas las de este usuario (filtrado por RLS en Supabase)
    this.misPeticiones = await this.supabase.getPeticionesStock('todas');
  }

  // Resetea el formulario y ajusta las validaciones según el tipo de solicitud
  resetForm() {
    const tipo = this.tipoActual;
    
    // Mantenemos el tipo, reseteamos lo demás
    this.form.patchValue({ 
      producto_id: '', 
      producto_nombre: '', 
      cantidad: 10, 
      nota: '' 
    });
    
    // Limpiar validadores
    this.limpiarValidadores();

    // Aplicar nuevos validadores lógicos
    if (tipo === 'stock') {
      this.form.get('producto_id')?.setValidators(Validators.required);
      this.form.get('cantidad')?.setValidators([Validators.required, Validators.min(1)]);
    } else if (tipo === 'nuevo_producto' || tipo === 'nueva_categoria') {
      this.form.get('producto_nombre')?.setValidators(Validators.required);
      this.form.get('nota')?.setValidators(Validators.required); // Descripción obligatoria
    } else if (tipo === 'editar_producto') {
      this.form.get('producto_id')?.setValidators(Validators.required);
      this.form.get('nota')?.setValidators(Validators.required); // Explicación obligatoria
    }

    this.form.updateValueAndValidity();
  }

  private limpiarValidadores() {
    const campos = ['producto_id', 'producto_nombre', 'cantidad', 'nota'];
    campos.forEach(campo => {
      this.form.get(campo)?.clearValidators();
      this.form.get(campo)?.updateValueAndValidity();
    });
  }

  getPlaceholderNota() {
    switch(this.tipoActual) {
      case 'stock': return 'Ej. Urgente para el fin de semana...';
      case 'nuevo_producto': return 'Ej. Precio sugerido $25, Categoría Panes...';
      case 'editar_producto': return 'Ej. El precio subió a $50...';
      case 'nueva_categoria': return 'Ej. Para agrupar los productos de temporada...';
      default: return 'Detalles...';
    }
  }
  
  // Si selecciona un producto existente, llenamos el nombre automáticamente
  onProductoChange() {
    const id = this.form.get('producto_id')?.value;
    if (id && id !== 'otro') {
      const producto = this.productos.find(p => p.id === id);
      if (producto) this.form.patchValue({ producto_nombre: producto.nombre });
    }
  }

  configurarValidaciones() {
    this.resetForm();
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    
    try {
      const formValue = this.form.value;
      
      const datos: Solicitud = {
        tipo: formValue.tipo,
        // Si es 'otro' o vacío, enviamos null como ID
        producto_id: (formValue.producto_id === 'otro' || !formValue.producto_id) ? null : formValue.producto_id,
        producto_nombre: formValue.producto_nombre,
        cantidad: formValue.tipo === 'stock' ? formValue.cantidad : 0,
        nota: formValue.nota
      };

      await this.supabase.crearSolicitud(datos);
      
      alert('Solicitud enviada correctamente.');
      this.resetForm();
      this.cargarMisPeticiones();

    } catch (error) {
      console.error(error);
      alert('Error al enviar solicitud.');
    } finally {
      this.loading = false;
    }
  }
}
