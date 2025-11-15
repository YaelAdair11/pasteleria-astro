import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SupabaseService } from './services/supabase.service'; // ✅ Asegúrate de importar el servicio

declare var bootstrap: any;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements AfterViewInit, OnDestroy {

  private observer!: MutationObserver;
  private initialized = new WeakSet<Element>();

  // ✅ INYECTAR SupabaseService en el constructor
  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngAfterViewInit(): void {
    this.inicializarTooltips();
    this.configurarNavigationListener();
    this.configurarMutationObserver();
    this.configurarManejoErroresAuth(); // ✅ NUEVO: Configurar manejo de errores
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** ✅ NUEVO: Manejar errores de autenticación globalmente */
  configurarManejoErroresAuth() {
    this.supabaseService.user$.subscribe({
      next: (user) => {
        // Usuario autenticado correctamente
        if (user) {
          console.log('✅ Usuario autenticado:', user.email);
        }
      },
      error: (error) => {
        console.error('❌ Error en autenticación:', error);
        
        // Si es error de token, limpiar y recargar
        if (error?.message?.includes('token') || 
            error?.message?.includes('JWT') ||
            error?.message?.includes('Refresh Token')) {
          
          console.warn('🔄 Token inválido detectado, limpiando autenticación...');
          
          // Limpiar tokens
          this.limpiarTokensAuth();
          
          // Redirigir al login después de un breve delay
          setTimeout(() => {
            if (!this.router.url.includes('/login')) {
              this.router.navigate(['/login']);
            }
          }, 1000);
        }
      }
    });

    // También escuchar errores de la sesión
    this.supabaseService.ready$.subscribe({
      error: (error) => {
        console.error('❌ Error en inicialización de auth:', error);
        this.limpiarTokensAuth();
      }
    });
  }

  /** ✅ NUEVO: Limpiar tokens de autenticación */
  private limpiarTokensAuth() {
    try {
      const tokens = [
        'supabase.auth.token',
        'sb-kxoaiojycpvrpnkwubda-auth-token'
      ];
      
      tokens.forEach(token => {
        localStorage.removeItem(token);
        sessionStorage.removeItem(token);
      });
      
      console.log('🧹 Tokens de autenticación limpiados');
    } catch (error) {
      console.warn('⚠️ Error limpiando tokens:', error);
    }
  }

  /** Detecta cambios del DOM dinámicos */
  configurarMutationObserver() {
    this.observer = new MutationObserver(() => {
      this.inicializarTooltips();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /** Reinicia tooltips al navegar entre rutas */
  configurarNavigationListener() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.inicializarTooltips(), 20);
      });
  }

  /** Inicializa tooltips evitando duplicados */
  inicializarTooltips() {
    const elementos = document.querySelectorAll('[data-bs-toggle="tooltip"]');

    elementos.forEach((el) => {
      if (!this.initialized.has(el)) {
        const tooltip = new bootstrap.Tooltip(el, {
          trigger: 'hover',
          delay: { show: 600, hide: 100 },
        });

        // Destruir tooltip al hacer click
        el.addEventListener('click', () => {
          const instance = bootstrap.Tooltip.getInstance(el);
          if (instance) {
            instance.hide();
            instance.dispose();
          }
        });

        this.initialized.add(el);
      }
    });
  }
}