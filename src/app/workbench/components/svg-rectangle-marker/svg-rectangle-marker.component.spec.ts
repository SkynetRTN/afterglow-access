import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SvgRectangleMarkerComponent } from "./svg-rectangle-marker.component";

describe("SvgRectangleMarkerComponent", () => {
  let component: SvgRectangleMarkerComponent;
  let fixture: ComponentFixture<SvgRectangleMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SvgRectangleMarkerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgRectangleMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
