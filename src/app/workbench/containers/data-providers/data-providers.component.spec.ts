import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DataProvidersComponent } from "./data-providers.component";

describe("DataProvidersComponent", () => {
  let component: DataProvidersComponent;
  let fixture: ComponentFixture<DataProvidersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DataProvidersComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataProvidersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
