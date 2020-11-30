import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DataProviderBrowsePageComponent } from "./data-provider-browse-page.component";

describe("DataProviderBrowsePageComponent", () => {
  let component: DataProviderBrowsePageComponent;
  let fixture: ComponentFixture<DataProviderBrowsePageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DataProviderBrowsePageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataProviderBrowsePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
