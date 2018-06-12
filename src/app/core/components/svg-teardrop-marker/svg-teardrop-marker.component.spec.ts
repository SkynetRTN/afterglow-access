import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgTeardropMarkerComponent } from './svg-teardrop-marker.component';

describe('SvgTeardropMarkerComponent', () => {
  let component: SvgTeardropMarkerComponent;
  let fixture: ComponentFixture<SvgTeardropMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SvgTeardropMarkerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgTeardropMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
