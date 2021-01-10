import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveChangesDialogComponent } from './file-dialog.component';

describe('FileDialogComponent', () => {
  let component: SaveChangesDialogComponent;
  let fixture: ComponentFixture<SaveChangesDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SaveChangesDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SaveChangesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
