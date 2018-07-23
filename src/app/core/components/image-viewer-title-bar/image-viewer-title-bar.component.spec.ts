import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageViewerTitleBarComponent } from './image-viewer-title-bar.component';

describe('ImageViewerTitleBarComponent', () => {
  let component: ImageViewerTitleBarComponent;
  let fixture: ComponentFixture<ImageViewerTitleBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageViewerTitleBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageViewerTitleBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
