import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FileInfoToolsetComponent } from './file-info-panel.component';

describe('InfoToolComponent', () => {
  let component: FileInfoToolsetComponent;
  let fixture: ComponentFixture<FileInfoToolsetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FileInfoToolsetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FileInfoToolsetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
