import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { HduSelectorComponent } from "./hdu-selector.component";

describe("HduSelectorComponent", () => {
  let component: HduSelectorComponent;
  let fixture: ComponentFixture<HduSelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [HduSelectorComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HduSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
