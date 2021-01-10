import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DataFileSelectionListComponent } from "./data-file-selection-list.component";

describe("DataFileSelectListComponent", () => {
  let component: DataFileSelectionListComponent;
  let fixture: ComponentFixture<DataFileSelectionListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DataFileSelectionListComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataFileSelectionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
