import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorMapSwatchComponent } from './color-map-swatch.component';

describe('ColorMapSwatchComponent', () => {
  let component: ColorMapSwatchComponent;
  let fixture: ComponentFixture<ColorMapSwatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ColorMapSwatchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ColorMapSwatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
