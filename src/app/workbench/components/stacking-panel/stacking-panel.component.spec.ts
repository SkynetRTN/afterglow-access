import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { StackerPageComponent } from "./stacking-panel.component";

describe("StackerPageComponent", () => {
  let component: StackerPageComponent;
  let fixture: ComponentFixture<StackerPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [StackerPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StackerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
