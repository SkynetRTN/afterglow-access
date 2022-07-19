import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalSettingsDialogComponent } from './global-settings-dialog.component';

describe('PhotSettingsDialogComponent', () => {
  let component: GlobalSettingsDialogComponent;
  let fixture: ComponentFixture<GlobalSettingsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GlobalSettingsDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
