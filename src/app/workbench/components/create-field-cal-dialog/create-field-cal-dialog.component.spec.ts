import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateFieldCalDialogComponent } from './create-field-cal-dialog.component';

describe('CreateFieldCalDialogComponent', () => {
  let component: CreateFieldCalDialogComponent;
  let fixture: ComponentFixture<CreateFieldCalDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateFieldCalDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateFieldCalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
