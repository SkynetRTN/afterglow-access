import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SvgCircleMarkerComponent } from "./svg-circle-marker.component";

describe("SvgCircleMarkerComponent", () => {
  let component: SvgCircleMarkerComponent;
  let fixture: ComponentFixture<SvgCircleMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SvgCircleMarkerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgCircleMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
