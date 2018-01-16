import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DataFileListItemComponent } from './data-file-list-item.component';

describe('ImageFileListItemComponent', () => {
  let component: DataFileListItemComponent;
  let fixture: ComponentFixture<DataFileListItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DataFileListItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataFileListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
