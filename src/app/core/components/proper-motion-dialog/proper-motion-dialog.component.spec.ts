import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProperMotionDialogComponent } from './proper-motion-dialog.component';

describe('PhotSettingsDialogComponent', () => {
  let component: ProperMotionDialogComponent;
  let fixture: ComponentFixture<ProperMotionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProperMotionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProperMotionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
