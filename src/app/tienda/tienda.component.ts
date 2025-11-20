import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

// ... (Interfaces Producto y Categoria igual que antes) ...
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
  categoria?: Categoria; 
  rating?: number;
  reseñas?: number;
  destacado?: boolean;
}

interface Categoria {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], 
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.css'],
})
export class TiendaComponent implements OnInit, OnDestroy {
  
  // ... (Variables de productos y filtros - Sin cambios) ...
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[] = [];
  categoriaSeleccionada = 'todos';
  precioMin = 0;
  precioMax = 5000;
  terminoBusqueda = '';
  ordenSeleccionado = 'nombre';
  mostrarFiltros = false;
  loading = false; 
  error: string | null = null; 
  private productosSubscription: any;
  readonly defaultImage = 'https://placehold.co/300x300?text=Sin+Imagen';

  // --- LÓGICA CARRITO ---
  carrito: { producto: Producto; cantidad: number }[] = [];
  private _carritoAbierto: boolean = false;

  get carritoAbierto(): boolean {
    return this._carritoAbierto;
  }

  set carritoAbierto(valor: boolean) {
    this._carritoAbierto = valor;
    // Bloquea o desbloquea el scroll del cuerpo de la página
    if (valor) {
      document.body.style.overflow = 'hidden'; // Bloquea scroll
    } else {
      document.body.style.overflow = ''; // Restaura scroll
    }
  }
  private readonly STORAGE_KEY = 'pasteleria_cart'; 
  
  // Control de pasos del checkout
  checkoutStep: 'cart' | 'shipping' | 'payment' | 'success' = 'cart'; 
  
  shippingInfo: any = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' };

  // 💳 NUEVO: Datos de Tarjeta Simulada
  datosTarjeta = {
    numero: '',
    nombre: '',
    expiracion: '',
    cvv: ''
  };

  // --- AUTH ---
  usuario: any = null; 
  mostrarAuthModal = false; 
  esRegistro = false; 
  authData = { email: '', password: '' };
  authError: string | null = null;
  authLoading = false;
  mostrarPassword = false;
  menuUsuarioAbierto = false;
  mostrarPerfilModal = false;
  perfilData = { username: '' };
  perfilLoading = false;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.cargarCarritoDesdeStorage(); 
    await this.cargarCategorias();   
    await this.cargarProductos();    
    this.suscribirCambiosProductos(); 

    this.supabase.user$.subscribe(user => {
      if (user && (user.rol === 'admin' || user.rol === 'empleado')) {
        this.usuario = null;
      } else {
        this.usuario = user;
        if (user) {
          this.shippingInfo.email = user.email;
          this.shippingInfo.nombre = user.username || user.email.split('@')[0];
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.productosSubscription) {
      this.productosSubscription.unsubscribe();
    }
  }

  // ... (Métodos de carga y filtros - Sin cambios) ...
  async cargarCategorias() { const categorias = await this.supabase.getCategorias(); this.categorias = categorias || []; }
  
  async cargarProductos() { 
    this.loading = true;
    try {
      const productos = await this.supabase.getProductos(false);
      this.productos = (productos || []).map((p) => ({
        ...p, 
        descripcion: p.descripcion ?? null, 
        // 2. CAMBIO: Usamos la imagen por defecto si viene null
        imagen: p.imagen ?? this.defaultImage, 
        creado_en: p.creado_en ?? '', 
        actualizado_en: p.actualizado_en ?? '',
        categoria: p.categoria || this.categorias.find((c) => c.id === p.categoria_id) || null,
        rating: this.generarRatingAleatorio(), 
        reseñas: this.generarReseñasAleatorias(), 
        destacado: Math.random() > 0.7,
      }));
      this.filtrarProductos(); 
    } catch (e: any) { this.error = 'Error productos'; } finally { this.loading = false; }
  }
  
  suscribirCambiosProductos() { 
    this.productosSubscription = this.supabase.suscribirCambiosProductos((p) => this.manejarCambioProducto(p)); }

  manejarCambioProducto(p: any) { this.cargarProductos(); }
  filtrarProductos() {
    this.productosFiltrados = this.productos.filter((producto) => {
      const cat = this.categoriaSeleccionada === 'todos' || producto.categoria_id === this.categoriaSeleccionada;
      const pre = producto.precio >= this.precioMin && producto.precio <= this.precioMax;
      const bus = !this.terminoBusqueda || producto.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) || (producto.descripcion && producto.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      return cat && pre && bus;
    });
    this.ordenarProductos();
  }
  ordenarProductos() { 
    if(this.ordenSeleccionado === 'precio-asc') this.productosFiltrados.sort((a,b)=>a.precio-b.precio);
    else if(this.ordenSeleccionado === 'precio-desc') this.productosFiltrados.sort((a,b)=>b.precio-a.precio);
    else if(this.ordenSeleccionado === 'stock-desc') this.productosFiltrados.sort((a,b)=>b.stock-a.stock);
    else this.productosFiltrados.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  }
  getNombreCategoria(p: Producto): string { return p.categoria?.nombre || this.categorias.find(c=>c.id===p.categoria_id)?.nombre || 'Sin cat'; }
  private generarRatingAleatorio(): number { return Number((Math.random() * (5 - 3) + 3).toFixed(1)); }
  private generarReseñasAleatorias(): number { return Math.floor(Math.random() * 200) + 1; }
  generarEstrellas(r: number): string { return '...'; } 

  // ... (Métodos Carrito - Sin cambios) ...
  private cargarCarritoDesdeStorage() { const d = localStorage.getItem(this.STORAGE_KEY); if (d) this.carrito = JSON.parse(d); }
  private guardarCarritoEnStorage() { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.carrito)); }
  
  agregarAlCarrito(p: Producto) {
    if (p.stock <= 0) { 
      this.mostrarNotificacion('Sin stock', true); 
      return; 
    }

    const ex = this.carrito.find((i) => i.producto.id === p.id);
    
    if (ex) { 
      if (ex.cantidad >= p.stock) { 
        this.mostrarNotificacion('Stock insuficiente', true); 
        return; 
      } 
      ex.cantidad++; 
    } else { 
      this.carrito.push({ producto: p, cantidad: 1 }); 
    }
    
    this.mostrarNotificacion(`${p.nombre} agregado`); 
    this.guardarCarritoEnStorage(); 
    
    this.checkoutStep = 'cart';
  }
  eliminarDelCarrito(i: number) { this.carrito.splice(i, 1); this.guardarCarritoEnStorage(); }
  actualizarCantidad(i: number, n: number) {
    const item = this.carrito[i]; if (!item) return;
    if (n <= 0) { this.eliminarDelCarrito(i); return; }
    if (n > item.producto.stock) { item.cantidad = item.producto.stock; } else { item.cantidad = n; }
    this.guardarCarritoEnStorage();
  }
  getTotalCarrito(): number { return this.carrito.reduce((t, i) => t + i.producto.precio * i.cantidad, 0); }
  getCantidadTotal(): number { return this.carrito.reduce((t, i) => t + i.cantidad, 0); }

  // ... (Auth y Perfil - Sin cambios) ...
  abrirLogin() { this.esRegistro = false; this.mostrarAuthModal = true; this.authError = null; this.mostrarPassword = false; }
  cerrarAuth() { this.mostrarAuthModal = false; this.authData = { email: '', password: '' }; }
  async procesarAuth() {
    this.authLoading = true; this.authError = null;
    try {
      if (this.esRegistro) {
        const autoUsername = this.authData.email.split('@')[0]; 
        const { error } = await this.supabase.crearEmpleado({ email: this.authData.email, password: this.authData.password, username: autoUsername, rol: 'usuario' });
        if (error) throw error;
        this.mostrarNotificacion('¡Registro exitoso!');
        await this.supabase.signInWithEmailOrUsername(this.authData.email, this.authData.password);
        this.cerrarAuth();
      } else {
        const { error } = await this.supabase.signInWithEmailOrUsername(this.authData.email, this.authData.password);
        if (error) throw error;
        this.mostrarNotificacion(`Bienvenido`);
        this.cerrarAuth();
      }
    } catch (e: any) { this.authError = e.message || 'Error auth'; } finally { this.authLoading = false; }
  }
  async salir() {
    this.menuUsuarioAbierto = false;
    await this.supabase.signOut();
    this.usuario = null;
    this.mostrarNotificacion('Sesión cerrada');
    this.shippingInfo = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' };
    if (this.checkoutStep !== 'cart') this.checkoutStep = 'cart';
  }
  abrirPerfil() { this.perfilData.username = this.usuario.username || ''; this.mostrarPerfilModal = true; this.menuUsuarioAbierto = false; }
  cerrarPerfil() { this.mostrarPerfilModal = false; }
  async guardarPerfil() {
    if (!this.perfilData.username.trim()) return;
    this.perfilLoading = true;
    try {
      const { error } = await this.supabase.updateEmpleado(this.usuario.id, { username: this.perfilData.username, rol: 'usuario' });
      if (error) throw error;
      this.usuario.username = this.perfilData.username;
      this.mostrarNotificacion('Perfil actualizado');
      this.cerrarPerfil();
    } catch (error: any) { this.mostrarNotificacion('Error: ' + error.message, true); } finally { this.perfilLoading = false; }
  }

  // --- 🚦 CONTROL DE CHECKOUT ---

  iniciarCheckout() {
    if (!this.usuario) { this.mostrarNotificacion('Inicia sesión para comprar', true); this.abrirLogin(); return; }
    this.checkoutStep = 'shipping';
  }
  
  irAPago() { 
    if (this.shippingInfo.nombre && this.shippingInfo.email && this.shippingInfo.direccion) {
      this.checkoutStep = 'payment'; 
      // Auto-llenar nombre de la tarjeta con el del envío por comodidad
      if (!this.datosTarjeta.nombre) this.datosTarjeta.nombre = this.shippingInfo.nombre.toUpperCase();
    } else {
      this.mostrarNotificacion('Faltan datos de envío', true); 
    }
  }
  
  volverA(paso: 'cart' | 'shipping') { this.checkoutStep = paso; }
  
  finalizarYVolver() { 
    this.checkoutStep = 'cart'; 
    this.carritoAbierto = false; 
    this.shippingInfo = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' }; 
    // Limpiar tarjeta
    this.datosTarjeta = { numero: '', nombre: '', expiracion: '', cvv: '' };
    this.cargarProductos(); 
  }

  async realizarCompra() {
    console.log('Intentando realizar compra...');

    if (this.carrito.length === 0) return;
    
    // Validación manual
    if (!this.datosTarjeta.numero || !this.datosTarjeta.nombre || !this.datosTarjeta.expiracion || !this.datosTarjeta.cvv) {
      this.mostrarNotificacion('Por favor, llena todos los campos de la tarjeta', true);
      return;
    }

    if (this.datosTarjeta.numero.length < 15 || this.datosTarjeta.cvv.length < 3) {
      this.mostrarNotificacion('Datos de tarjeta incompletos o inválidos', true);
      return;
    }

    this.loading = true; 
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const promesas = this.carrito.map(item => {
        // 1. Aseguramos que el total tenga solo 2 decimales
        const totalCalculado = parseFloat((item.producto.precio * item.cantidad).toFixed(2));

        return this.supabase.registrarVentaConStock({
          producto_id: item.producto.id, 
          cantidad: item.cantidad, 
          total: totalCalculado,
          metodo_pago: 'Tarjeta', // 2. CAMBIO: Usamos 'Tarjeta' (igual que en tu base de datos) en vez de 'Tarjeta Online'
          // usuario_id: este campo se ignora si no existe en la tabla ventas, así que no estorba
        });
      });
      
      await Promise.all(promesas);
      console.log('Compra exitosa!');
      this.checkoutStep = 'success'; 
      this.carrito = []; 
      this.guardarCarritoEnStorage(); 
    } catch (e: any) { 
      console.error('Error en compra:', e);
      this.error = `Error: ${e.message || 'Revisa la consola para más detalles'}`; 
      this.mostrarNotificacion('Ocurrió un error al procesar la venta', true); 
    } finally { 
      this.loading = false; 
    }
  }

  // Formato visual para el input de tarjeta
  formatearTarjeta() {
    let val = this.datosTarjeta.numero.replace(/\D/g, '');
    val = val.replace(/(.{4})/g, '$1 ').trim(); // Espacio cada 4 dígitos
    this.datosTarjeta.numero = val.substring(0, 19); // Max 16 dígitos + 3 espacios
  }

  formatearExpiracion() {
    let val = this.datosTarjeta.expiracion.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    this.datosTarjeta.expiracion = val.substring(0, 5); // MM/YY
  }

  mostrarNotificacion(m: string, e: boolean = false) {
    const n = document.createElement('div'); n.className = 'notification-toast'; n.textContent = m;
    n.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${e ? '#d9534f' : '#c62b66'}; color: white; padding: 1rem; border-radius: 0.5rem; z-index: 2000; box-shadow: 0 4px 10px rgba(0,0,0,0.1); animation: slideInRight 0.3s ease-out;`;
    document.body.appendChild(n); setTimeout(() => n.remove(), 3000);
  }

  getOrderId(): string {
    if (!this.usuario || !this.usuario.id) return 'ORD-GUEST';
    // Convertimos a string explícitamente para evitar errores de tipo
    const idString = String(this.usuario.id);
    return 'ORD-' + idString.substring(0, 6).toUpperCase();
  }
}
