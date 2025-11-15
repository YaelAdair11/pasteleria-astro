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
  categorias?: { id: string; nombre: string };
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
  styleUrls: ['./tienda.component.css']
})
export class TiendaComponent implements OnInit, OnDestroy {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categorias: Categoria[] = [];
  carrito: { producto: Producto; cantidad: number }[] = [];

  categoriaSeleccionada = 'todos';
  precioMin = 0;
  precioMax = 5000;
  terminoBusqueda = '';
  ordenSeleccionado = 'nombre';
  mostrarFiltros = false;
  carritoAbierto = false;
  loading = false;
  error: string | null = null;

  private productosSubscription: any;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.cargarCategorias();
    await this.cargarProductos();
    this.suscribirCambiosProductos();
  }

  ngOnDestroy() {
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

  async cargarProductos() {
  this.loading = true;
  try {
    const productos = await this.supabase.getProductos(false);
    console.log('✅ Productos cargados:', productos);

    // 🔧 Reparar el enlace con categorías (por si Supabase devuelve null)
    this.productos = (productos || []).map(p => ({
      ...p,
      categorias: p.categorias || this.categorias.find(c => c.id === p.categoria_id) || null,
      rating: this.generarRatingAleatorio(),
      reseñas: this.generarReseñasAleatorias(),
      destacado: Math.random() > 0.7
    }));

    this.filtrarProductos();
  } catch (error: any) {
    console.error('Error cargando productos:', error);
    this.error = 'Error al cargar los productos.';
  } finally {
    this.loading = false;
  }
}


  // ✅ Suscripción en tiempo real
  suscribirCambiosProductos() {
    this.productosSubscription = this.supabase.suscribirCambiosProductos((payload) => {
      console.log('🔁 Cambio en productos detectado:', payload);
      this.manejarCambioProducto(payload);
    });
  }

  manejarCambioProducto(payload: any) {
    // Si hay cambios de stock o actualización, recargamos los productos
    this.cargarProductos();
  }

  // ✅ Filtros de búsqueda y categoría
  filtrarProductos() {
    this.productosFiltrados = this.productos.filter(producto => {
      const categoriaMatch = this.categoriaSeleccionada === 'todos' || producto.categoria_id === this.categoriaSeleccionada;
      const precioMatch = producto.precio >= this.precioMin && producto.precio <= this.precioMax;
      const busquedaMatch =
        !this.terminoBusqueda ||
        producto.nombre.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));

      return categoriaMatch && precioMatch && busquedaMatch;
    });

    this.ordenarProductos();
  }

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

  getNombreCategoria(producto: Producto): string {
    if (producto.categorias?.nombre) return producto.categorias.nombre;
    const categoria = this.categorias.find(c => c.id === producto.categoria_id);
    return categoria ? categoria.nombre : 'Sin categoría';
  }

  private generarRatingAleatorio(): number {
    return Number((Math.random() * (5 - 3) + 3).toFixed(1));
  }

  private generarReseñasAleatorias(): number {
    return Math.floor(Math.random() * 200) + 1;
  }

  // ✅ Carrito
  agregarAlCarrito(producto: Producto) {
    if (producto.stock <= 0) {
      this.mostrarNotificacion('Producto sin stock disponible');
      return;
    }
    const existente = this.carrito.find(i => i.producto.id === producto.id);
    if (existente) {
      if (existente.cantidad >= producto.stock) {
        this.mostrarNotificacion('No hay suficiente stock disponible');
        return;
      }
      existente.cantidad++;
    } else {
      this.carrito.push({ producto, cantidad: 1 });
    }
    this.mostrarNotificacion(`${producto.nombre} agregado al carrito`);
  }

  eliminarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
  }

  actualizarCantidad(index: number, nuevaCantidad: number) {
    const item = this.carrito[index];
    if (nuevaCantidad <= 0) this.eliminarDelCarrito(index);
    else if (nuevaCantidad > item.producto.stock)
      this.mostrarNotificacion('No hay suficiente stock disponible');
    else item.cantidad = nuevaCantidad;
  }

  getTotalCarrito(): number {
    return this.carrito.reduce((t, i) => t + i.producto.precio * i.cantidad, 0);
  }

  getCantidadTotal(): number {
    return this.carrito.reduce((t, i) => t + i.cantidad, 0);
  }

  async realizarCompra() {
    if (this.carrito.length === 0) return;
    this.loading = true;
    try {
      this.mostrarNotificacion('¡Compra realizada con éxito! Total: $' + this.getTotalCarrito());
      this.carrito = [];
      this.carritoAbierto = false;
      await this.cargarProductos(); // refrescar stock
    } catch (error: any) {
      this.error = 'Error al procesar la compra: ' + error.message;
    } finally {
      this.loading = false;
    }
  }

  mostrarNotificacion(mensaje: string) {
    const n = document.createElement('div');
    n.className = 'notification-toast';
    n.textContent = mensaje;
    n.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #c62b66;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  generarEstrellas(rating: number): string {
    const llenas = Math.floor(rating);
    const media = rating % 1 >= 0.5;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= llenas) html += '<i class="fas fa-star"></i>';
      else if (i === llenas + 1 && media) html += '<i class="fas fa-star-half-alt"></i>';
      else html += '<i class="far fa-star"></i>';
    }
    return html;
  }
}
