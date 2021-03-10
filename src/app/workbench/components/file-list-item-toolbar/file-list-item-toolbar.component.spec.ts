import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileListItemToolbarComponent } from './file-list-item-toolbar.component';

describe('FileListItemToolbarComponent', () => {
  let component: FileListItemToolbarComponent;
  let fixture: ComponentFixture<FileListItemToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileListItemToolbarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileListItemToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
