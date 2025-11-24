import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Buzon } from './buzon';

describe('Buzon', () => {
  let component: Buzon;
  let fixture: ComponentFixture<Buzon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Buzon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Buzon);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
