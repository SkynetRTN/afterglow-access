import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgCrosshairMarkerComponent } from './svg-crosshair-marker.component';

describe('SvgCrosshairMarkerComponent', () => {
  let component: SvgCrosshairMarkerComponent;
  let fixture: ComponentFixture<SvgCrosshairMarkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SvgCrosshairMarkerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgCrosshairMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
