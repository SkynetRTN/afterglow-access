import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgPhotometryMarkerComponent } from './svg-photometry-marker.component';

describe('SvgPhotometryMarkerComponent', () => {
  let component: SvgPhotometryMarkerComponent;
  let fixture: ComponentFixture<SvgPhotometryMarkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SvgPhotometryMarkerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgPhotometryMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
