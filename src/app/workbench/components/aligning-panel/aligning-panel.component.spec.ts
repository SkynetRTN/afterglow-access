import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AlignerPageComponent } from "./aligning-panel.component";

describe("AlignerPageComponent", () => {
  let component: AlignerPageComponent;
  let fixture: ComponentFixture<AlignerPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AlignerPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AlignerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
