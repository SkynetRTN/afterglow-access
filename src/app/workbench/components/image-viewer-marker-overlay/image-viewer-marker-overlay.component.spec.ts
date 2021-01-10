import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ImageViewerMarkerOverlayComponent } from "./image-viewer-marker-overlay.component";

describe("ImageViewerMarkerOverlayComponent", () => {
  let component: ImageViewerMarkerOverlayComponent;
  let fixture: ComponentFixture<ImageViewerMarkerOverlayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ImageViewerMarkerOverlayComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageViewerMarkerOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
