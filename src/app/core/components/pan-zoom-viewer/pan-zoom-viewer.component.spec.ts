import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PanZoomViewerComponent } from './pan-zoom-viewer.component';

describe('PanZoomViewerComponent', () => {
  let component: PanZoomViewerComponent;
  let fixture: ComponentFixture<PanZoomViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PanZoomViewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PanZoomViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
