import { AfterViewInit, Component, OnDestroy  } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.inicializarTooltips();
    this.configurarNavigationListener();
    this.configurarMutationObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
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
          // placement: el.getAttribute('data-bs-placement') || 'right'
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
