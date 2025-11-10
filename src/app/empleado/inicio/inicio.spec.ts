import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InicioEmpleado } from './inicio';

describe('Inicio', () => {
  let component: InicioEmpleado;
  let fixture: ComponentFixture<InicioEmpleado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioEmpleado],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InicioEmpleado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
