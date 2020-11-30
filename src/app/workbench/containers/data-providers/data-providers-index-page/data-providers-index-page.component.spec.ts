import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DataProvidersIndexPageComponent } from "./data-providers-index-page.component";

describe("DataProvidersIndexPageComponent", () => {
  let component: DataProvidersIndexPageComponent;
  let fixture: ComponentFixture<DataProvidersIndexPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DataProvidersIndexPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataProvidersIndexPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
