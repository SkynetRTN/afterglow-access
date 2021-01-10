import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { WorkbenchDataFileListComponent } from "./workbench-data-file-list.component";

describe("WorkbenchDataFileListComponent", () => {
  let component: WorkbenchDataFileListComponent;
  let fixture: ComponentFixture<WorkbenchDataFileListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WorkbenchDataFileListComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkbenchDataFileListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
