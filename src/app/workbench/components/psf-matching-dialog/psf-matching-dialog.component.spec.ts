import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PsfMatchingDialogComponent } from './psf-matching-dialog.component';

describe('PsfMatchingDialogComponent', () => {
  let component: PsfMatchingDialogComponent;
  let fixture: ComponentFixture<PsfMatchingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PsfMatchingDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PsfMatchingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
