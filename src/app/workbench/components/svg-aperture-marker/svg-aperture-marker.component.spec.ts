import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SvgApertureMarkerComponent } from "./svg-aperture-marker.component";

describe("SvgApertureMarkerComponent", () => {
  let component: SvgApertureMarkerComponent;
  let fixture: ComponentFixture<SvgApertureMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SvgApertureMarkerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgApertureMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
