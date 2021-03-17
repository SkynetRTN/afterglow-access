import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileListOptionComponent } from './file-list-option.component';

describe('FileListOptionComponent', () => {
  let component: FileListOptionComponent;
  let fixture: ComponentFixture<FileListOptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FileListOptionComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileListOptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
