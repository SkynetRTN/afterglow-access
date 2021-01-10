import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { PhotometryPageComponent } from "./photometry-panel.component";

describe("SourceExtractorPageComponent", () => {
  let component: PhotometryPageComponent;
  let fixture: ComponentFixture<PhotometryPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PhotometryPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotometryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
