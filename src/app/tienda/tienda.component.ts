import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

// --- Definición de Interfaces ---
interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagen: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  categoria_id: string;
  categoria?: Categoria; // La '?' significa que es opcional
  rating?: number;
  reseñas?: number;
  destacado?: boolean;
}

interface Categoria {
  id: string;
  nombre: string;
}

// --- Definición del Componente ---
@Component({
  selector: 'app-tienda',
  standalone: true, // ¡Componente Standalone!
  imports: [CommonModule, FormsModule, RouterModule], 
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.css'],
})
export class TiendaComponent implements OnInit, OnDestroy {
  
  // --- Propiedades para los Productos y Filtros ---
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[] = [];

  categoriaSeleccionada = 'todos';
  precioMin = 0;
  precioMax = 5000;
  terminoBusqueda = '';
  ordenSeleccionado = 'nombre';
  mostrarFiltros = false;
  loading = false; // Para mostrar spinners
  error: string | null = null; // Para mostrar errores
  private productosSubscription: any; // Para la suscripción en tiempo real

  // --- 🛒 NUESTRA LÓGICA DE CARRITO Y CHECKOUT ---

  carrito: { producto: Producto; cantidad: number }[] = [];
  carritoAbierto = false; // Controla el sidebar
  
  // Definimos una llave para guardar el carrito en el navegador
  private readonly STORAGE_KEY = 'pasteleria_cart'; 

  // Esta variable es la CLAVE de nuestro flujo de pago.
  // Nos dice en qué paso del checkout estamos.
  checkoutStep: string = 'cart'; // Pasos: 'cart', 'shipping', 'payment', 'success'
  
  // Un objeto simple para guardar los datos del formulario de envío
  // Usamos [(ngModel)] para conectarlo al HTML
  shippingInfo: any = {
    nombre: '',
    email: '',
    direccion: '',
    ciudad: '',
    codigo_postal: ''
  };
  
  // --- 🛒 FIN DE LÓGICA ---

  // Inyectamos el servicio de Supabase
  constructor(private supabase: SupabaseService) {}

  // --- Ciclo de Vida: ngOnInit ---
  // Esto se ejecuta cuando el componente se carga por primera vez
  async ngOnInit() {
    this.cargarCarritoDesdeStorage(); // ¡Importante! Cargamos el carrito guardado
    await this.cargarCategorias();   // Cargamos las categorías de la BD
    await this.cargarProductos();    // Cargamos los productos de la BD
    this.suscribirCambiosProductos(); // Nos conectamos a Supabase en tiempo real
  }

  // --- Ciclo de Vida: ngOnDestroy ---
  // Esto se ejecuta cuando el componente se destruye (ej. cambiamos de página)
  ngOnDestroy() {
    // Es buena práctica "des-suscribirse" para evitar fugas de memoria
    if (this.productosSubscription) {
      this.productosSubscription.unsubscribe();
    }
  }


  // ✅ Cargar categorías
  async cargarCategorias() {
    try {
      const categorias = await this.supabase.getCategorias();
      this.categorias = categorias || [];
      console.log('✅ Categorías cargadas:', this.categorias);
    } catch (error: any) {
      console.error('Error cargando categorías:', error);
      this.error = 'Error al cargar las categorías.';
    }
  }

  // ✅ Cargar productos 
  async cargarProductos() {
    this.loading = true;
    try {
      const productos = await this.supabase.getProductos(false);
      console.log('✅ Productos cargados:', productos);

      
      this.productos = (productos || []).map((p) => ({
        ...p,
        descripcion: p.descripcion ?? null,
        imagen: p.imagen ?? null,
        creado_en: p.creado_en ?? '',
        actualizado_en: p.actualizado_en ?? '',
        categoria:
          p.categoria ||
          this.categorias.find((c) => c.id === p.categoria_id) ||
          null,
        rating: this.generarRatingAleatorio(),
        reseñas: this.generarReseñasAleatorias(),
        destacado: Math.random() > 0.7,
      }));

      this.filtrarProductos(); // Aplicamos los filtros
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      this.error = 'Error al cargar los productos.';
    } finally {
      this.loading = false;
    }
  }

  // ✅ Suscripción en tiempo real
  suscribirCambiosProductos() {
    this.productosSubscription = this.supabase.suscribirCambiosProductos(
      (payload) => {
        console.log('🔁 Cambio en productos detectado:', payload);
        // Si algo cambia (ej. stock), recargamos todo
        this.manejarCambioProducto(payload);
      }
    );
  }

  manejarCambioProducto(payload: any) {
    this.cargarProductos();
  }

  // ✅ Filtros de búsqueda y categoría 
  filtrarProductos() {
    this.productosFiltrados = this.productos.filter((producto) => {
      
      // Compara con 'this.categoriaSeleccionada'
      const categoriaMatch =
        this.categoriaSeleccionada === 'todos' ||
        producto.categoria_id === this.categoriaSeleccionada;
      
      // Compara con 'this.precioMin' y 'this.precioMax'
      const precioMatch =
        producto.precio >= this.precioMin && producto.precio <= this.precioMax;

      // 3. Lógica de búsqueda
      const busquedaMatch =
        !this.terminoBusqueda ||
        producto.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (producto.descripcion &&
          producto.descripcion
            .toLowerCase()
            .includes(this.terminoBusqueda.toLowerCase()));

      // Devolvemos true solo si cumple las 3 condiciones
      return categoriaMatch && precioMatch && busquedaMatch;
    });

    // Al final, re-ordenamos los productos filtrados
    this.ordenarProductos();
  }

  // ✅ Ordenar productos 
  ordenarProductos() {
    switch (this.ordenSeleccionado) {
      case 'precio-asc':
        this.productosFiltrados.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio-desc':
        this.productosFiltrados.sort((a, b) => b.precio - a.precio);
        break;
      case 'stock-desc':
        this.productosFiltrados.sort((a, b) => b.stock - a.stock);
        break;
      default:
        this.productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  }

  // ✅ Helpers de UI
  getNombreCategoria(producto: Producto): string {
    if (producto.categoria?.nombre) return producto.categoria.nombre;
    const categoria = this.categorias.find(
      (c) => c.id === producto.categoria_id
    );
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  private generarRatingAleatorio(): number {
    return Number((Math.random() * (5 - 3) + 3).toFixed(1));
  }

  private generarReseñasAleatorias(): number {
    return Math.floor(Math.random() * 200) + 1;
  }

  generarEstrellas(rating: number): string {
    const llenas = Math.floor(rating);
    const media = rating % 1 >= 0.5;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= llenas) html += '<i class="fas fa-star"></i>';
      else if (i === llenas + 1 && media)
        html += '<i class="fas fa-star-half-alt"></i>';
      else html += '<i class="far fa-star"></i>';
    }
    return html;
  }

  // --- 🛒 AQUÍ EMPIEZAN NUESTRAS FUNCIONES DE CARRITO Y CHECKOUT ---

  // --- (Funciones de persistencia) ---
  
  /**
   * (NUEVA) Carga el carrito desde el localStorage del navegador.
   * La llamamos en el ngOnInit.
   */
  private cargarCarritoDesdeStorage() {
    const cartData = localStorage.getItem(this.STORAGE_KEY);
    // Si encontramos datos, los cargamos en nuestro 'this.carrito'
    if (cartData) {
      this.carrito = JSON.parse(cartData);
    }
  }

  /**
   * (NUEVA) Guarda el estado actual de 'this.carrito' en el localStorage.
   * La llamamos CADA VEZ que modificamos el carrito.
   */
  private guardarCarritoEnStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.carrito));
  }

  // --- (Funciones de carrito modificadas) ---

  /**
   * (MODIFICADA) Añade un producto al carrito.
   */
  agregarAlCarrito(producto: Producto) {
    // 1. Validaciones (igual que antes)
    if (producto.stock <= 0) {
      this.mostrarNotificacion('Producto sin stock disponible', true); // Error
      return;
    }
    const existente = this.carrito.find((i) => i.producto.id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        this.mostrarNotificacion('No hay suficiente stock disponible', true); // Error
        return;
      }
      existente.cantidad++; // Si existe, solo sumamos 1
    } else {
      this.carrito.push({ producto, cantidad: 1 }); // Si no, lo añadimos
    }
    
    // 2. Feedback y persistencia (Lo nuevo)
    this.mostrarNotificacion(`${producto.nombre} agregado al carrito`);
    this.guardarCarritoEnStorage(); // ¡Guardamos!
    this.carritoAbierto = true;    // Abrimos el sidebar
    this.checkoutStep = 'cart';  // Nos aseguramos de estar en la vista de 'cart'
  }

  /**
   * (MODIFICADA) Elimina un item del carrito.
   */
  eliminarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.guardarCarritoEnStorage(); // ¡Guardamos!
  }

  /**
   * (MODIFICADA) Actualiza la cantidad de un item.
   */
  actualizarCantidad(index: number, nuevaCantidad: number) {
    const item = this.carrito[index];
    if (!item) return;

    if (nuevaCantidad <= 0) {
      this.eliminarDelCarrito(index); // Si es 0 o menos, lo borramos
      return;
    }

    if (nuevaCantidad > item.producto.stock) {
      this.mostrarNotificacion('No hay suficiente stock disponible', true); // Error
      item.cantidad = item.producto.stock; // Lo ajustamos al máximo disponible
    } else {
      item.cantidad = nuevaCantidad; // Actualizamos normal
    }
    this.guardarCarritoEnStorage(); // ¡Guardamos!
  }

  // --- (Funciones 'getter' del carrito - Sin cambios) ---
  getTotalCarrito(): number {
    return this.carrito.reduce((t, i) => t + i.producto.precio * i.cantidad, 0);
  }

  getCantidadTotal(): number {
    return this.carrito.reduce((t, i) => t + i.cantidad, 0);
  }

  // --- (NUEVAS funciones de flujo de checkout) ---

  /**
   * (NUEVA) Cambia la vista del sidebar a 'shipping'
   */
  iniciarCheckout() {
    this.checkoutStep = 'shipping';
  }

  /**
   * (NUEVA) Valida el formulario de envío y pasa a 'payment'
   */
  irAPago() {
    // Validación súper simple (se puede mejorar)
    if (this.shippingInfo.nombre && this.shippingInfo.email && this.shippingInfo.direccion) {
      this.checkoutStep = 'payment'; // Siguiente paso
    } else {
      this.mostrarNotificacion('Por favor, completa todos los campos de envío', true);
    }
  }

  /**
   * (NUEVA) Permite al usuario "volver" en los pasos del checkout
   */
  volverA(paso: 'cart' | 'shipping') {
    this.checkoutStep = paso;
  }

  /**
   * (NUEVA) Cierra el sidebar y resetea todo.
   * Se usa desde la pantalla de "Éxito".
   */
  finalizarYVolver() {
    this.checkoutStep = 'cart'; // Resetea el paso
    this.carritoAbierto = false; // Cierra el sidebar
    // Limpia el formulario
    this.shippingInfo = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' };
    // Recargamos los productos por si acaso
    this.cargarProductos();
  }

  /**
   * (MODIFICADA) Esta es la función final.
   * Se llama desde el paso 'payment' y habla con Supabase.
   */
  async realizarCompra() {
    if (this.carrito.length === 0) return;

    this.loading = true; // Activamos el spinner
    this.error = null;

    try {
      // 1. Creamos un array de promesas.
      // Usamos .map() para convertir cada item del carrito en una promesa de "registrarVenta".
      const promesasDeVenta = this.carrito.map(item => {
        const ventaData = {
          producto_id: item.producto.id,
          cantidad: item.cantidad,
          total: item.producto.precio * item.cantidad,
          metodo_pago: 'Tarjeta',
          // Podríamos añadir los datos del cliente que recolectamos:
          // cliente_nombre: this.shippingInfo.nombre
        };
        // Usamos la función que YA EXISTÍA en nuestro supabase.service
        return this.supabase.registrarVentaConStock(ventaData);
      });

      // 2. Ejecutamos TODAS las promesas a la vez.
      // Promise.all espera a que todas terminen. Si UNA falla, todo falla.
      await Promise.all(promesasDeVenta);

      // 3. ¡Éxito!
      this.checkoutStep = 'success'; // Mostramos la pantalla de éxito
      this.carrito = []; // Vaciamos el carrito
      this.guardarCarritoEnStorage(); // Guardamos el carrito vacío
      
    } catch (error: any) {
      // 4. ¡Error!
      console.error('Error al procesar la compra:', error);
      this.error = `Error al procesar la compra: ${error.message || error}`;
      this.mostrarNotificacion(this.error, true); // Mostramos el error
      this.checkoutStep = 'payment'; // Devolvemos al usuario al paso de pago
    } finally {
      this.loading = false; // Desactivamos el spinner
    }
  }

  /**
   * (MODIFICADA) La mejoramos para que acepte un flag de 'esError'
   * y así poder mostrar notificaciones rojas.
   */
  mostrarNotificacion(mensaje: string, esError: boolean = false) {
    const n = document.createElement('div');
    n.className = 'notification-toast';
    n.textContent = mensaje;
    n.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${esError ? '#d9534f' : '#c62b66'}; /* ¡Lógica de color aquí! */
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 2000; /* Super alto para que se vea sobre el overlay */
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      animation: slideInRight 0.3s ease-out;
    `;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000); // Se borra sola después de 3 seg
  }
}