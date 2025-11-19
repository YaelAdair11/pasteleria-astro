import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

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
  
  // ... (Variables de productos - Sin cambios) ...
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

  // --- LÓGICA CARRITO ---
  carrito: { producto: Producto; cantidad: number }[] = [];
  carritoAbierto = false; 
  private readonly STORAGE_KEY = 'pasteleria_cart'; 
  checkoutStep: string = 'cart'; 
  shippingInfo: any = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' };

  // --- 🔐 AUTH ---
  usuario: any = null; 
  mostrarAuthModal = false; 
  esRegistro = false; 
  authData = { email: '', password: '' };
  authError: string | null = null;
  authLoading = false;
  mostrarPassword = false;

  // --- 👤 PERFIL Y MENÚ (NUEVO) ---
  menuUsuarioAbierto = false; // Controla el dropdown del icono
  mostrarPerfilModal = false; // Controla el modal de editar perfil
  perfilData = { username: '' }; // Datos temporales para editar
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

  // ... (Carga de datos - Sin cambios) ...
  async cargarCategorias() { const categorias = await this.supabase.getCategorias(); this.categorias = categorias || []; }
  async cargarProductos() { 
    this.loading = true;
    try {
      const productos = await this.supabase.getProductos(false);
      this.productos = (productos || []).map((p) => ({
        ...p, descripcion: p.descripcion ?? null, imagen: p.imagen ?? null, creado_en: p.creado_en ?? '', actualizado_en: p.actualizado_en ?? '',
        categoria: p.categoria || this.categorias.find((c) => c.id === p.categoria_id) || null,
        rating: this.generarRatingAleatorio(), reseñas: this.generarReseñasAleatorias(), destacado: Math.random() > 0.7,
      }));
      this.filtrarProductos(); 
    } catch (e: any) { this.error = 'Error productos'; } finally { this.loading = false; }
  }
  suscribirCambiosProductos() { this.productosSubscription = this.supabase.suscribirCambiosProductos((p) => this.manejarCambioProducto(p)); }
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

  // ... (Carrito - Sin cambios) ...
  private cargarCarritoDesdeStorage() { const d = localStorage.getItem(this.STORAGE_KEY); if (d) this.carrito = JSON.parse(d); }
  private guardarCarritoEnStorage() { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.carrito)); }
  agregarAlCarrito(p: Producto) {
    if (p.stock <= 0) { this.mostrarNotificacion('Sin stock', true); return; }
    const ex = this.carrito.find((i) => i.producto.id === p.id);
    if (ex) { if (ex.cantidad >= p.stock) { this.mostrarNotificacion('Stock insuficiente', true); return; } ex.cantidad++; } 
    else { this.carrito.push({ producto: p, cantidad: 1 }); }
    this.mostrarNotificacion(`${p.nombre} agregado`); this.guardarCarritoEnStorage(); this.carritoAbierto = true; this.checkoutStep = 'cart';
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

  // --- 🔐 AUTH ---
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
    this.menuUsuarioAbierto = false; // Cerrar menú
    await this.supabase.signOut();
    this.usuario = null;
    this.mostrarNotificacion('Sesión cerrada');
    this.shippingInfo = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' };
    if (this.checkoutStep !== 'cart') this.checkoutStep = 'cart';
  }

  // --- 👤 GESTIÓN DE PERFIL (NUEVO) ---
  
  abrirPerfil() {
    this.perfilData.username = this.usuario.username || '';
    this.mostrarPerfilModal = true;
    this.menuUsuarioAbierto = false; // Cerrar el dropdown
  }

  cerrarPerfil() {
    this.mostrarPerfilModal = false;
  }

  async guardarPerfil() {
    if (!this.perfilData.username.trim()) return;
    this.perfilLoading = true;
    try {
      // Asumiendo que tienes updateEmpleado o similar en el servicio para actualizar la tabla perfiles
      const { error } = await this.supabase.updateEmpleado(this.usuario.id, {
        username: this.perfilData.username,
        rol: 'usuario' // Mantenemos el rol
      });

      if (error) throw error;

      // Actualizamos localmente para ver el cambio inmediato
      this.usuario.username = this.perfilData.username;
      this.mostrarNotificacion('Perfil actualizado correctamente');
      this.cerrarPerfil();

    } catch (error: any) {
      this.mostrarNotificacion('Error al actualizar: ' + error.message, true);
    } finally {
      this.perfilLoading = false;
    }
  }

  // ... (Checkout - Sin cambios) ...
  iniciarCheckout() { if (!this.usuario) { this.mostrarNotificacion('Inicia sesión para comprar', true); this.abrirLogin(); return; } this.checkoutStep = 'shipping'; }
  irAPago() { if (this.shippingInfo.nombre && this.shippingInfo.email && this.shippingInfo.direccion) this.checkoutStep = 'payment'; else this.mostrarNotificacion('Faltan datos', true); }
  volverA(paso: 'cart' | 'shipping') { this.checkoutStep = paso; }
  finalizarYVolver() { this.checkoutStep = 'cart'; this.carritoAbierto = false; this.shippingInfo = { nombre: '', email: '', direccion: '', ciudad: '', codigo_postal: '' }; this.cargarProductos(); }
  async realizarCompra() {
    if (this.carrito.length === 0) return;
    this.loading = true; 
    try {
      const promesas = this.carrito.map(item => {
        return this.supabase.registrarVentaConStock({ producto_id: item.producto.id, cantidad: item.cantidad, total: item.producto.precio * item.cantidad, metodo_pago: 'Tarjeta', usuario_id: this.usuario?.id });
      });
      await Promise.all(promesas);
      this.checkoutStep = 'success'; this.carrito = []; this.guardarCarritoEnStorage(); 
    } catch (e: any) { this.error = `Error: ${e.message}`; this.mostrarNotificacion(this.error, true); } finally { this.loading = false; }
  }
  mostrarNotificacion(m: string, e: boolean = false) {
    const n = document.createElement('div'); n.className = 'notification-toast'; n.textContent = m;
    n.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${e ? '#d9534f' : '#c62b66'}; color: white; padding: 1rem; border-radius: 0.5rem; z-index: 2000; box-shadow: 0 4px 10px rgba(0,0,0,0.1); animation: slideInRight 0.3s ease-out;`;
    document.body.appendChild(n); setTimeout(() => n.remove(), 3000);
  }
}