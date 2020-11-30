import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CircleMarkerEditorComponent } from "./circle-marker-editor.component";

describe("CircleMarkerEditorComponent", () => {
  let component: CircleMarkerEditorComponent;
  let fixture: ComponentFixture<CircleMarkerEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CircleMarkerEditorComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CircleMarkerEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
