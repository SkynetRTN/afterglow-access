import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SvgLineMarkerComponent } from "./svg-line-marker.component";

describe("SvgLineMarkerComponent", () => {
  let component: SvgLineMarkerComponent;
  let fixture: ComponentFixture<SvgLineMarkerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SvgLineMarkerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgLineMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
