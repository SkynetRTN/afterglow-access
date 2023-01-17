import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgSourceMarkerComponent } from './svg-source-marker.component';

describe('SvgSourceMarkerComponent', () => {
  let component: SvgSourceMarkerComponent;
  let fixture: ComponentFixture<SvgSourceMarkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SvgSourceMarkerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgSourceMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
