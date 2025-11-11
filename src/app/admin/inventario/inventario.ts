import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Producto } from '../../models/producto.model';
import { SupabaseService } from '../../services/supabase.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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

  modalEliminar!: any; // ✨ Añade esta variable para el nuevo modal
  errorMensaje: string | null = null; // ✨ Añade esta para los errores
  
  categorias = ["Pasteles", "Galletas", "Pan", "Postres"];
  productos: Producto[] = [];

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

  constructor(private supabase: SupabaseService, private fb: FormBuilder) {}

  ngOnInit() {
    this.cargarProductos();
    this.cargarFormulario();

    this.userSubscription = this.supabase.user$.subscribe(user => {
      this.estaAutenticado = !!user; // true si hay usuario, false si es null
    });
  }

  ngOnDestroy() {
    // Importante limpiar la suscripción
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  cargarFormulario() {
    // crear formulario
    this.formProducto = this.fb.group({
      nombre: ['', Validators.required],
      categoria: ['', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      imagen: [''],
      activo: [true]
    });


    // inicializar modal
    const el = document.getElementById('modalCrearProducto');
    if (!el) return;
    this.modalCrear = new bootstrap.Modal(el);
    el.addEventListener('hide.bs.modal', (event: any) => {
      if (this.procesando) {
        event.preventDefault(); // ⛔ Evita que se cierre
        event.stopImmediatePropagation();
      }
    });
  }

  abrirModalCrear() {
    this.isEditMode = false;
    this.productoEnFormulario = null;

    this.formProducto.reset({
      nombre: '',
      categoria: '',
      precio: 0,
      stock: 0,
      imagen: '',
      activo: true
    });

    // ✨ RESETEAR LA VISTA PREVIA
    this.imagenPreview = null;
    this.selectedFile = null;
    
    // Limpiar el campo de archivo (si existe)
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) { fileInput.value = ''; }
    
    this.resetTabs();

    this.modalCrear.show();
  }

  // ✨ --- AÑADE ESTA NUEVA FUNCIÓN ---
  abrirModalEditar(producto: Producto) {
    // 1. Establece el modo
    this.isEditMode = true;
    this.productoEnFormulario = producto;

    // 2. Resetea el formulario (limpia validaciones)
    this.formProducto.reset();
    
    // 3. Rellena el formulario con los datos del producto
    //    Usamos patchValue porque es más seguro si el modelo
    //    no coincide exactamente con el formulario.
    this.formProducto.patchValue(producto);

    // 4. Establece la vista previa y resetea archivos
    this.imagenPreview = producto.imagen ?? null;
    this.selectedFile = null;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.resetTabs(); // Llama a la función para resetear tabs

    // 5. Muestra el modal
    this.modalCrear.show();
  }

  private resetTabs() {
    // Resetear las pestañas a la de "URL"
    const urlTab = document.getElementById('url-tab');
    if (urlTab) {
      // Usamos un try/catch por si el modal aún no está en el DOM
      try {
        const tab = new bootstrap.Tab(urlTab);
        tab.show();
      } catch (e) {
        // Ignora el error si el tab no puede mostrarse
      }
    }
  }

  // ✨ --- ESTA ES TU NUEVA FUNCIÓN DE ENVÍO ---
  async onSubmitForm() {

    // 2. Verificación de formulario
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }

    // 3. Bifurcación: ¿Editar o Crear?
    if (this.isEditMode) {
      await this.ejecutarActualizacion(); // Llama a la lógica de actualizar
    } else {
      await this.ejecutarCreacion(); // Llama a la lógica de crear
    }
  }


  // ✨ --- LÓGICA DE CREAR (extraída de tu función anterior) ---
  private async ejecutarCreacion() {
    this.procesando = true;
    try {
      const nuevo = { ...this.formProducto.value };

      // Lógica de imagen (subida)
      if (this.selectedFile) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.selectedFile);
        nuevo.imagen = imageUrl; 
      } else if (nuevo.imagen === '') {
        nuevo.imagen = null;
      }
      
      console.log('Creando producto en DB', nuevo);
      await this.supabase.addProducto(nuevo);

      await this.cargarProductos();
      this.modalCrear.hide();
    } catch (err) {
      console.error('Error creando producto', err);
    }
    this.procesando = false;
  }


  // ✨ --- NUEVA LÓGICA DE ACTUALIZAR ---
  private async ejecutarActualizacion() {
    if (!this.productoEnFormulario) {
      console.error('No hay producto seleccionado para editar');
      return;
    }

    this.procesando = true;
    try {
      // Obtiene el ID del producto guardado
      const id = this.productoEnFormulario.id; 
      // Obtiene todos los valores nuevos del formulario
      const cambios = { ...this.formProducto.value }; 

      // TODO: Lógica de imagen para Actualizar
      // (Esto es más complejo: si sube archivo nuevo,
      // hay que subirlo y BORRAR el anterior de Storage)
      
      // Por ahora, solo actualiza la URL si cambió o se subió una nueva
      if (this.selectedFile) {
        const imageUrl = await this.supabase.uploadImagenProducto(this.selectedFile);
        cambios.imagen = imageUrl;
        // Aquí faltaría borrar la imagen antigua: this.productoEnFormulario.imagen
      } else if (cambios.imagen === '') {
        cambios.imagen = null;
      }
      
      console.log('Actualizando producto', id, cambios);
      await this.supabase.updateProducto(id, cambios);

      await this.cargarProductos();
      this.modalCrear.hide();
    } catch (err) {
      console.error('Error actualizando producto', err);
    }
    this.procesando = false;
  }

  // ✨ NUEVA FUNCIÓN: Se activa al pegar una URL
  onUrlChanged(event: any) {
    const url = event.target.value;
    if (url) {
      this.imagenPreview = url;
      this.selectedFile = null; // Limpiamos el archivo si se pega URL
      
      // Limpiar el input de archivo
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } else {
      this.imagenPreview = null;
    }
  }

  // ✨ NUEVA FUNCIÓN: Se activa al seleccionar un archivo
  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) {
      // Si el usuario cancela, no hagas nada
      return;
    }

    this.selectedFile = file;
    // Limpiamos la URL si se selecciona un archivo
    this.formProducto.controls['imagen'].setValue(''); 

    // Leer el archivo para mostrar la vista previa
    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreview = reader.result;
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
      
      // 1. ¿Hay un archivo seleccionado para subir?
      if (this.selectedFile) {
        // Si hay un archivo, lo subimos primero
        console.log('Subiendo imagen...');
        const imageUrl = await this.supabase.uploadImagenProducto(this.selectedFile);
        
        // Asignamos la URL de Supabase Storage al campo 'imagen'
        nuevo.imagen = imageUrl; 
      
      } else {
        // 2. Si no hay archivo, usamos la URL (o la volvemos null)
        if (nuevo.imagen === '') {
          nuevo.imagen = null;
        }
      }
      
      console.log('Creando producto', nuevo);
      await this.supabase.addProducto(nuevo);

      await this.cargarProductos();

    } catch (err) {
      console.error('Error creando producto', err);
    }

    this.procesando = false;

    // Cerrar modal de forma segura
    const el = document.getElementById('modalCrearProducto');
    const instance = bootstrap.Modal.getInstance(el);
    instance?.hide();
  }

  /** ✅ Modal se inicializa SOLO cuando el DOM ya está cargado */
  ngAfterViewInit() {
    // const el = document.getElementById('modalConfirmar');
    // if (!el) return;
    // this.modal = bootstrap.Modal.getOrCreateInstance(el);
    // el.addEventListener('hide.bs.modal', (event: any) => {
    //   if (this.procesando) {
    //     event.preventDefault(); // ⛔ Evita que se cierre
    //     event.stopImmediatePropagation();
    //   }
    // });

    // Tu modal de confirmar (toggle)
    const elConfirmar = document.getElementById('modalConfirmar');
    if (elConfirmar) {
      this.modal = bootstrap.Modal.getOrCreateInstance(elConfirmar);
      elConfirmar.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesando) event.preventDefault();
      });
    }

    // ✨ --- AÑADE LA INICIALIZACIÓN DEL NUEVO MODAL ---
    const elEliminar = document.getElementById('modalEliminarProducto');
    if (elEliminar) {
      this.modalEliminar = bootstrap.Modal.getOrCreateInstance(elEliminar);
      elEliminar.addEventListener('hide.bs.modal', (event: any) => {
        if (this.procesando) event.preventDefault();
      });
    }
  }

  // ✨ --- AÑADE ESTA NUEVA FUNCIÓN ---
  solicitarEliminacion(producto: Producto) {
    this.productoSeleccionado = producto; // Reutilizamos esta variable
    this.errorMensaje = null; // Limpiamos errores
    this.modalEliminar.show();
  }

  // ✨ --- AÑADE ESTA NUEVA FUNCIÓN ---
  async confirmarEliminacion() {
    if (!this.productoSeleccionado) return;

    this.procesando = true;
    this.errorMensaje = null;
    const productoAEliminar = this.productoSeleccionado; // Guarda la referencia

    try {
      // 1. Eliminar de la base de datos (tabla 'productos')
      await this.supabase.deleteProducto(productoAEliminar.id);

      // 2. Eliminar la imagen de Supabase Storage
      //    (Usando la función que creamos en la optimización)
      await this.supabase.deleteImagenProducto(productoAEliminar.imagen);

      // 3. Actualizar la UI (quitando el producto del array local)
      this.productos = this.productos.filter(p => p.id !== productoAEliminar.id);

      // 4. Cerrar el modal y limpiar
      this.productoSeleccionado = null;

    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      this.errorMensaje = err.message || 'Ocurrió un error inesperado al eliminar.';
    }

    this.procesando = false;

    // Cerrar modal de forma segura
    const el = document.getElementById('modalEliminarProducto');
    const instance = bootstrap.Modal.getInstance(el);
    instance?.hide();
  }

  async cargarProductos() {
    this.productos = await this.supabase.getProductos(true);
  }

  /** ✅ Evita activar el checkbox hasta confirmar */
  solicitarConfirmacion(producto: any, event: any) {
    this.productoSeleccionado = producto;
    this.nuevoValor = event.target.checked;

    // Revertimos temporalmente el switch
    event.target.checked = producto.activo;

    this.modal.show();
  }

  /** ✅ Lógica correcta para confirmar */
  async confirmarCambio() {
    this.procesando = true;
    try {
      await this.supabase.updateProducto(this.productoSeleccionado.id, {
        activo: this.nuevoValor,
      });

      // Actualizar en UI
      this.productoSeleccionado.activo = this.nuevoValor;

    } catch (err) {
      console.error('Error al actualizar estado:', err);
    }

    this.procesando = false;

    // Cerrar modal de forma segura
    const el = document.getElementById('modalConfirmar');
    const instance = bootstrap.Modal.getInstance(el);
    instance?.hide();
  }


  buscar(event: any) {
    const texto = event.target.value.toLowerCase();
    // Aquí puedes filtrar productos
  }

  filtrarActivo(event: any) {
    const valor = event.target.value;
    // Filtrar por true, false o todos
  }

  filtrarCategoria(event: any) {
    const categoria = event.target.value;
    // Filtrar por categoría
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('active');
    }
  }

  private colorCache: { [key: string]: string } = {};

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
