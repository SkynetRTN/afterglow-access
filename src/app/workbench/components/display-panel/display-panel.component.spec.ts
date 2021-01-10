import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DisplayToolsetComponent } from "./display-panel.component";

describe("ViewerPageComponent", () => {
  let component: DisplayToolsetComponent;
  let fixture: ComponentFixture<DisplayToolsetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DisplayToolsetComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayToolsetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
