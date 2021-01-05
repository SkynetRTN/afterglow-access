import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { StackerPanelComponent } from "./stacking-panel.component";

describe("StackerPageComponent", () => {
  let component: StackerPanelComponent;
  let fixture: ComponentFixture<StackerPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [StackerPanelComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StackerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
