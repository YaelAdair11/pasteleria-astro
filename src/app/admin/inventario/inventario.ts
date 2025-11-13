import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Producto } from '../../models/producto.model';
import { Categoria } from '../../models/categoria.model';
import { SupabaseService } from '../../services/supabase.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-inventario',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario {
  userSubscription!: Subscription;
  estaAutenticado = false;

  modalEliminar!: any;
  errorMensaje: string | null = null;
  
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  todosLosProductos: Producto[] = [];

  filtroTexto: string = '';
  filtroActivo: string = '';
  filtroCategoria: string = '';

  isEditMode = false;
  productoEnFormulario: Producto | null = null;

  formProducto!: FormGroup;
  modalCrear!: any;
  imagenPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;

  modal!: any;
  productoSeleccionado: any = null;
  nuevoValor = false;
  procesando = false;

  modalCategorias!: any;
  formCategorias!: FormGroup;
  categoriasOriginales: Categoria[] = [];
  procesandoCategoria = false;
  errorCategoria: string | null = null;

  constructor(private supabase: SupabaseService, private fb: FormBuilder) {}

  ngOnInit() {
    this.cargarCategorias();
    this.cargarProductos();
    this.cargarFormulario();

    this.userSubscription = this.supabase.user$.subscribe(user => {
      this.estaAutenticado = !!user;
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  cargarFormulario() {
    this.formProducto = this.fb.group({
      nombre: ['', Validators.required],
      categoria_id: ['', Validators.required], // ✅ usar id
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      imagen: [''],
      activo: [true]
    });

    this.formCategorias = this.fb.group({
      categorias: this.fb.array([]) 
    });

    const el = document.getElementById('modalCrearProducto');
    if (!el) return;
    this.modalCrear = new bootstrap.Modal(el);
    el.addEventListener('hide.bs.modal', (event: any) => {
      if (this.procesando) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  }

  get categoriasFormArray() {
    return this.formCategorias.get('categorias') as FormArray;
  }

  abrirModalCrear() {
    this.isEditMode = false;
    this.productoEnFormulario = null;

    this.formProducto.reset({
      nombre: '',
      categoria_id: '',
      precio: 0,
      stock: 0,
      imagen: '',
      activo: true
    });

    this.imagenPreview = null;
    this.selectedFile = null;
    
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) { fileInput.value = ''; }
    
    this.resetTabs();
    this.modalCrear.show();
  }

  abrirModalEditar(producto: Producto) {
    this.isEditMode = true;
    this.productoEnFormulario = producto;

    this.formProducto.reset();
    this.formProducto.patchValue(producto);

    this.imagenPreview = producto.imagen ?? null;
    this.selectedFile = null;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.resetTabs();
    this.modalCrear.show();
  }

  async onSubmitForm() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }

    if (this.isEditMode) {
      await this.ejecutarActualizacion();
    } else {
      await this.ejecutarCreacion();
    }
  }

  private async ejecutarCreacion() {
    this.procesando = true;
    try {
      const nuevo = { ...this.formProducto.value };

      if (this.selectedFile) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.selectedFile);
        nuevo.imagen = imageUrl; 
      } else if (nuevo.imagen === '') {
        nuevo.imagen = null;
      }
      
      await this.supabase.addProducto(nuevo);
      await this.cargarProductos();
      this.modalCrear.hide();
    } catch (err) {
      console.error('Error creando producto', err);
    }
    this.procesando = false;
  }

  private async ejecutarActualizacion() {
    if (!this.productoEnFormulario) return;

    this.procesando = true;
    try {
      const id = this.productoEnFormulario.id; 
      const cambios = { ...this.formProducto.value }; 

      if (this.selectedFile) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.selectedFile);
        cambios.imagen = imageUrl;
      } else if (cambios.imagen === '') {
        cambios.imagen = null;
      }
      
      await this.supabase.updateProducto(id, cambios);
      await this.cargarProductos();
      this.modalCrear.hide();
    } catch (err) {
      console.error('Error actualizando producto', err);
    }
    this.procesando = false;
  }

  onUrlChanged(event: any) {
    const url = event.target.value;
    if (url) {
      this.imagenPreview = url;
      this.selectedFile = null;
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      this.imagenPreview = null;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.formProducto.controls['imagen'].setValue(''); 

    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreview = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async cargarCategorias() {
    const data = await this.supabase.getCategorias();
    this.categorias = data;
    this.categoriasOriginales = data;
  }

  async cargarProductos() {
    const data = await this.supabase.getProductos(true);
    this.todosLosProductos = data;
    this.aplicarFiltros();
  }

  buscar(event: any) {
    this.filtroTexto = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }

  filtrarActivo(event: any) {
    this.filtroActivo = event.target.value;
    this.aplicarFiltros();
  }

  filtrarCategoria(event: any) {
    const categoria = event.target.value;
    if (categoria === '__NUEVA__') {
      this.modalCategorias.show(); // ✅ así se abre el modal correctamente
      event.target.value = '';
    }else {
      this.filtroCategoria = categoria;
      this.aplicarFiltros();
    }
  }

  aplicarFiltros() {
    let productosFiltrados = [...this.todosLosProductos];

    if (this.filtroTexto) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.nombre.toLowerCase().includes(this.filtroTexto)
      );
    }

    if (this.filtroCategoria) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.categoria_id === this.filtroCategoria
      );
    }

    if (this.filtroActivo === 'true') {
      productosFiltrados = productosFiltrados.filter(p => p.activo);
    } else if (this.filtroActivo === 'false') {
      productosFiltrados = productosFiltrados.filter(p => !p.activo);
    }

    this.productos = productosFiltrados;
  }

  colorAleatorio(nombre: string): string {
    const colores = ['#FF6B6B', '#4D96FF', '#6BCB77', '#FFD93D', '#845EC2', '#FF9671', '#00C9A7', '#FF6F91'];
    const hash = Array.from(nombre).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colores[hash % colores.length];
  }

  private resetTabs() {
    const urlTab = document.getElementById('url-tab');
    if (urlTab) {
      try {
        const tab = new bootstrap.Tab(urlTab);
        tab.show();
      } catch {}
    }
  }
  // ✅ Añade esto dentro de la clase Inventario
  getNombreCategoria(id: number | string): string {
    const categoria = this.categorias.find(c => c.id === id);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

}
