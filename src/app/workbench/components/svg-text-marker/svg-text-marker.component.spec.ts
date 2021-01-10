import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SvgTextMarkerComponent } from "./svg-text-marker.component";

describe("SvgTextMarkerComponent", () => {
  let component: SvgTextMarkerComponent;
  let fixture: ComponentFixture<SvgTextMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SvgTextMarkerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgTextMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
