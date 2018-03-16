import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PanZoomCanvasComponent } from './pan-zoom-canvas.component';

describe('PanZoomViewerComponent', () => {
  let component: PanZoomCanvasComponent;
  let fixture: ComponentFixture<PanZoomCanvasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PanZoomCanvasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PanZoomCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
