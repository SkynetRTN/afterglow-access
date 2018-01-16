import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotSettingsDialogComponent } from './phot-settings-dialog.component';

describe('PhotSettingsDialogComponent', () => {
  let component: PhotSettingsDialogComponent;
  let fixture: ComponentFixture<PhotSettingsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PhotSettingsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
