import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageViewerStatusBarComponent } from './image-viewer-status-bar.component';

describe('ImageViewerStatusBarComponent', () => {
  let component: ImageViewerStatusBarComponent;
  let fixture: ComponentFixture<ImageViewerStatusBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageViewerStatusBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageViewerStatusBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
