import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CustomMarkerPanelComponent } from "./custom-marker-panel.component";

describe("CustomMarkerPageComponent", () => {
  let component: CustomMarkerPanelComponent;
  let fixture: ComponentFixture<CustomMarkerPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CustomMarkerPanelComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomMarkerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
