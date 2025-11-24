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

  modalCrearEditar!: any;
  modalConfirmar!: any;
  modalEliminar!: any;
  modalCategorias!: any;
  
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  todosLosProductos: Producto[] = [];

  filtroTexto: string = '';
  filtroActivo: string = '';
  filtroCategoria: string = '';
  filtroStock: string = '';

  modoEdicion = false;
  productoSeleccionado: Producto | null = null;

  formProducto!: FormGroup;
  imagenProducto: string | ArrayBuffer | null = null;
  archivoImagen: File | null = null;
  productoActivoCheckBox = false;
  procesando = false;

  formCategorias!: FormGroup;
  procesandoCategoria = false;
  errorCategoria: string | null = null;

  modalMensaje!: any;
  mensajeTitulo: string = '';
  mensajeCuerpo: string = '';
  mensajeTipo: 'success' | 'error' = 'success';

  private colorCache: { [key: string]: string } = {};
  
  constructor(private supabase: SupabaseService, private fb: FormBuilder) {}

  ngOnInit() {
    this.cargarCategorias();
    this.cargarProductos();
    this.cargarFormulario();
  }

  ngAfterViewInit() {
    const elConfirmar = document.getElementById('modalConfirmar');
    if (elConfirmar) {
      this.modalConfirmar = bootstrap.Modal.getOrCreateInstance(elConfirmar);
      elConfirmar.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesando) event.preventDefault();
      });
    }

    const elEliminar = document.getElementById('modalEliminarProducto');
    if (elEliminar) {
      this.modalEliminar = bootstrap.Modal.getOrCreateInstance(elEliminar);
      elEliminar.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesando) event.preventDefault();
      });
    }

    const elCategorias = document.getElementById('modalGestionarCategorias');
    if (elCategorias) {
      this.modalCategorias = new bootstrap.Modal(elCategorias);
      elCategorias.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesandoCategoria) event.preventDefault();
      });
    }

    const elCrearEditar = document.getElementById('modalCrearProducto');
    if (elCrearEditar) {
      this.modalCrearEditar = new bootstrap.Modal(elCrearEditar);
      elCrearEditar.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesandoCategoria) event.preventDefault();
      });
    }

    const elMensaje = document.getElementById('modalMensaje');
    if (elMensaje) {
      this.modalMensaje = new bootstrap.Modal(elMensaje);
    }
  }

  mostrarMensaje(titulo: string, cuerpo: string, tipo: 'success' | 'error') {
    this.mensajeTitulo = titulo;
    this.mensajeCuerpo = cuerpo;
    this.mensajeTipo = tipo;
    this.modalMensaje.show();
  }

  cargarFormulario() {
    this.formProducto = this.fb.group({
      nombre: ['', Validators.required],
      categoria_id: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      imagen: [''],
      activo: [true]
    });

    this.formCategorias = this.fb.group({
      categorias: this.fb.array([]) 
    });
  }

  get categoriasFormArray() {
    return this.formCategorias.get('categorias') as FormArray;
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.productoSeleccionado = null;
    this.imagenProducto = null;
    this.archivoImagen = null;
    this.formProducto.reset({
      nombre: '',
      categoria_id: '',
      precio: 0,
      stock: 0,
      imagen: null,
      activo: true
    });
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) { fileInput.value = ''; }
    this.reiniciarTabsImagen();
    this.modalCrearEditar.show();
  }

  abrirModalEditar(producto: Producto) {
    this.modoEdicion = true;
    this.productoSeleccionado = producto;
    this.formProducto.reset();
    this.formProducto.patchValue(
      {
        nombre: producto.nombre,
        categoria_id: producto.categoria_id,
        precio: producto.precio,
        stock: producto.stock,
        imagen: producto.imagen ?? null,
        activo: producto.activo
      }
    );
    this.imagenProducto = producto.imagen ?? null;
    this.archivoImagen = null;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.reiniciarTabsImagen();
    this.modalCrearEditar.show();
  }

  abrirModalCategorias() {
    this.categoriasFormArray.clear();
    this.categorias.forEach(c => {
      this.categoriasFormArray.push(this.fb.group({
        id: [c.id],
        nombre: [c.nombre, Validators.required]
      }));
    });
    this.errorCategoria = null;
    this.procesandoCategoria = false;
    this.modalCategorias.show();
  }

  agregarCategoriaForm() {
    this.categoriasFormArray.push(this.fb.group({
      id: [null], 
      nombre: ['', Validators.required]
    }));
  }

  eliminarCategoriaForm(index: number) {
    this.categoriasFormArray.removeAt(index);
  }

  async guardarCambiosCategorias() {
    this.procesandoCategoria = true;
    this.errorCategoria = null;
    if (this.formCategorias.invalid) {
      this.errorCategoria = 'No puede haber categorías vacías.';
      this.procesandoCategoria = false;
      return;
    }
    const formValues: Categoria[] = this.categoriasFormArray.value.map((c: Categoria) => ({
      ...c,
      nombre: c.nombre.trim()
    })).filter((c: Categoria) => c.nombre); 
    const nombres = formValues.map(c => c.nombre.toLowerCase());
    const duplicados = nombres.some((nombre, index) => 
      nombres.indexOf(nombre) !== index
    );
    if (duplicados) {
      this.errorCategoria = 'No puede haber categorías duplicadas (ignorando mayúsculas).';
      this.procesandoCategoria = false;
      return;
    }
    try {
      const originales = [...this.categorias];
      const paraActualizarOCrear = formValues.map(cat => ({
        id: cat.id || undefined, 
        nombre: cat.nombre
      }));
      const paraEliminar = originales.filter(original => 
        !formValues.some(nueva => nueva.id === original.id)
      );
      const crearPromises = paraActualizarOCrear.filter(c => !c.id).map(c => this.supabase.addCategoria(c.nombre));
      const actualizarPromises = paraActualizarOCrear.filter(c => c.id).map(c => this.supabase.updateCategoria(c.id!, c.nombre));
      const eliminarPromises = paraEliminar.map(c => this.supabase.deleteCategoria(c.id!));
      await Promise.all([...crearPromises, ...actualizarPromises, ...eliminarPromises]);
      await this.cargarCategorias(); 
      await this.cargarProductos(); 
      this.validarCategoriaFormulario();
      this.modalCategorias.hide();
      this.mostrarMensaje('Categorías Actualizadas', 'Los cambios en las categorías se han guardado correctamente.', 'success');
    } catch (err: any) {
      console.error('Error guardando categorías:', err);
      if (err.message.includes('23505') || err.message.includes('unique constraint')) {
        this.errorCategoria = 'Error: Ya existe una categoría con ese nombre.';
      } else if (err.message.includes('23503') || err.message.includes('foreign key constraint')) {
        this.errorCategoria = 'Error: No se puede eliminar una categoría que está siendo usada por productos.';
      } else {
        this.errorCategoria = err.message || 'Ocurrió un error inesperado.';
      }
    }
    this.procesandoCategoria = false;
  }
  
  validarCategoriaFormulario() {
    const idCategoriaSeleccionada = this.formProducto.get('categoria_id')?.value;
    if (!idCategoriaSeleccionada) return;
    const sigueExistiendo = this.categorias.some(c => c.id === idCategoriaSeleccionada);
    if (!sigueExistiendo) {
      this.formProducto.get('categoria_id')?.setValue('');
    }
  }

  private reiniciarTabsImagen() {
    const urlTab = document.getElementById('url-tab');
    if (urlTab) {
      const tab = new bootstrap.Tab(urlTab);
      tab.show();
    }
  }

  async onSubmitForm() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    if (this.modoEdicion) {
      await this.actualizarProducto();
    } else {
      await this.ejecutarCreacion();
      await this.ejecutarCreacion();
    }
  }

  private async ejecutarCreacion() {
    this.procesando = true;
    try {
      const nuevo = { ...this.formProducto.value };

      // Lógica de imagen (subida)
      if (this.archivoImagen) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.archivoImagen);
        nuevo.imagen = imageUrl; 
      } else if (nuevo.imagen === '') {
        nuevo.imagen = null;
      }
      
      await this.supabase.addProducto(nuevo);
      await this.cargarProductos();
      this.modalCrearEditar.hide();
    } catch (err) {
      console.error('Error creando producto', err);
    }
    this.procesando = false;
  }


  // ✨ --- NUEVA LÓGICA DE ACTUALIZAR ---
  private async actualizarProducto() {
    if (!this.productoSeleccionado) {
      console.error('No hay producto seleccionado para editar');
      return;
    }

    this.procesando = true;
    try {
      const id = this.productoSeleccionado.id;
      const cambios = { ...this.formProducto.value };
      if (this.archivoImagen) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.archivoImagen);
        cambios.imagen = imageUrl;
      } else if (cambios.imagen === '') {
        cambios.imagen = null;
      }
      await this.supabase.updateProducto(id, cambios);
      await this.cargarProductos();
      this.modalCrearEditar.hide();
      this.mostrarMensaje('¡Producto Actualizado!', `El producto "${cambios.nombre}" se ha guardado correctamente.`, 'success');
    } catch (err: any) {
      console.error('Error actualizando producto', err);
      this.mostrarMensaje('Error al Actualizar', err.message || 'Ocurrió un problema al guardar los cambios.', 'error');
    }
    this.procesando = false;
  }

  onUrlChanged(event: any) {
    const url = event.target.value;
    if (url) {
      this.imagenProducto = url;
      this.archivoImagen = null; // Limpiamos el archivo si se pega URL
      
      // Limpiar el input de archivo
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      this.imagenProducto = null;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.archivoImagen = file;
    // Limpiamos la URL si se selecciona un archivo
    this.formProducto.controls['imagen'].setValue(''); 

    const reader = new FileReader();
    reader.onload = () => {
      this.imagenProducto = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async crearProducto() {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    this.procesando = true;
    try {
      const nuevo = { ...this.formProducto.value };
      if (this.archivoImagen) {
        console.log('Subiendo imagen...');
        const imageUrl = await this.supabase.uploadImagenProducto(this.archivoImagen);
        nuevo.imagen = imageUrl; 
      } else {
        if (nuevo.imagen === '') {
          nuevo.imagen = null;
        }
      }
      console.log('Creando producto', nuevo);
      await this.supabase.addProducto(nuevo);
      await this.cargarProductos();
      this.modalCrearEditar.hide();
      this.mostrarMensaje('¡Producto Creado!', `El producto "${nuevo.nombre}" se ha creado correctamente.`, 'success');
    } catch (err: any) {
      console.error('Error creando producto', err);
      this.mostrarMensaje('Error al Crear', err.message || 'Ocurrió un problema al crear el producto.', 'error');
    }

    this.procesando = false;
  }

  // ✨ --- AÑADE ESTA NUEVA FUNCIÓN ---
  solicitarEliminacion(producto: Producto) {
    this.productoSeleccionado = producto;
    this.modalEliminar.show();
  }

  // ✨ --- AÑADE ESTA NUEVA FUNCIÓN ---
  async confirmarEliminacion() {
    if (!this.productoSeleccionado) return;

    this.procesando = true;
    const productoAEliminar = this.productoSeleccionado;

    try {
      await this.supabase.deleteProducto(productoAEliminar.id);
      await this.supabase.deleteImagenProducto(productoAEliminar.imagen);
      this.productos = this.productos.filter(p => p.id !== productoAEliminar.id);
      this.productoSeleccionado = null;
      this.mostrarMensaje('Producto Eliminado', `El producto "${productoAEliminar.nombre}" ha sido eliminado.`, 'success');

    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      this.mostrarMensaje('Error al Eliminar', err.message || 'No se pudo eliminar el producto.', 'error');
    }
    
    this.procesando = false;
    this.modalEliminar.hide();
  }

  async cargarCategorias() {
    this.categorias = await this.supabase.getCategorias();
    console.log('Categorías cargadas:', this.categorias);
  }

  async cargarProductos() {
    const data = await this.supabase.getProductos(true);
    this.todosLosProductos = data;
    console.log('Productos cargados:', this.todosLosProductos);
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
    console.log('Categoría seleccionada para filtrar:', categoria);
    
    if (categoria === '__NUEVA__') {
      this.modalCategorias.show(); // ✅ así se abre el modal correctamente
      event.target.value = '';
    }else {
      this.filtroCategoria = categoria;
      this.aplicarFiltros();
    }
  }

  filtrarStock(event: any) {
    const stockFiltro = event.target.value;
    this.filtroStock = stockFiltro;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let productosFiltrados = [...this.todosLosProductos];

    if (this.filtroTexto) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.nombre.toLowerCase().includes(this.filtroTexto)
      );
    }

    if (this.filtroCategoria) {
      console.log('Filtrando por categoría:', this.filtroCategoria);
      productosFiltrados = productosFiltrados.filter(p => 
        p.categoria.nombre === this.filtroCategoria
      );
    }

    if (this.filtroActivo === 'true') {
      productosFiltrados = productosFiltrados.filter(p => p.activo);
    } else if (this.filtroActivo === 'false') {
      productosFiltrados = productosFiltrados.filter(p => !p.activo);
    }

    if (this.filtroStock) {
      if (this.filtroStock === 'agotado') {
        productosFiltrados = productosFiltrados.filter(p => p.stock <= 0);
      } else if (this.filtroStock === 'critico') {
        productosFiltrados = productosFiltrados.filter(p => p.stock > 0 && p.stock <= 4);
      } else if (this.filtroStock === 'bajo') {
        productosFiltrados = productosFiltrados.filter(p => p.stock > 4 && p.stock <= 9);
      } else if (this.filtroStock === 'disponible') {
        productosFiltrados = productosFiltrados.filter(p => p.stock > 9);
      }
    }

    this.productos = productosFiltrados;
  }
  // --- FIN DE LÓGICA DE FILTRADO ---

  /** ✅ Evita activar el checkbox hasta confirmar */
  solicitarConfirmacion(producto: any, event: any) {
    this.productoSeleccionado = producto;
    this.productoActivoCheckBox = event.target.checked;

    // Revertimos temporalmente el switch
    event.target.checked = producto.activo;

    this.modalConfirmar.show();
  }

  /** Lógica correcta para confirmar */
  async confirmarCambio() {
    this.procesando = true;
    try {
      if (!this.productoSeleccionado) return;

      await this.supabase.updateProducto(this.productoSeleccionado.id!, {
        activo: this.productoActivoCheckBox,
      });
      this.productoSeleccionado.activo = this.productoActivoCheckBox;
      const index = this.todosLosProductos.findIndex(p => p.id === this.productoSeleccionado!.id);
      if (index > -1) {
        this.todosLosProductos[index].activo = this.productoActivoCheckBox;
      }
      this.aplicarFiltros(); 
      
      // Opcional: Mostrar mensaje de éxito rápido o toast
      this.mostrarMensaje('Estado Actualizado', 'El estado del producto ha cambiado.', 'success');

    } catch (err: any) {
      console.error('Error al actualizar estado:', err);
      this.mostrarMensaje('Error', 'No se pudo cambiar el estado del producto.', 'error');
    }
    this.procesando = false;
    this.modalConfirmar.hide();
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('active');
    }
  }
  // ✅ Añade esto dentro de la clase Inventario
  getNombreCategoria(id: number | string): string {
    const categoria = this.categorias.find(c => c.id === id);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  colorAleatorio(nombre: string): string {
    if (this.colorCache[nombre]) {
      return this.colorCache[nombre];
    }

    // Paleta bonita para productos
    const colores = [
      '#FF6B6B', '#4D96FF', '#6BCB77',
      '#FFD93D', '#845EC2', '#FF9671',
      '#00C9A7', '#FF6F91'
    ];

    // Generar índice basado en el nombre
    const hash = Array.from(nombre)
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const color = colores[hash % colores.length];
    this.colorCache[nombre] = color;
    return color;
  }

}
