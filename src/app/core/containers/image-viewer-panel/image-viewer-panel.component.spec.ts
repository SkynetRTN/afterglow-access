import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageViewerPanelComponent } from './image-viewer-panel.component';

describe('ViewerComponent', () => {
  let component: ImageViewerPanelComponent;
  let fixture: ComponentFixture<ImageViewerPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageViewerPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageViewerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
