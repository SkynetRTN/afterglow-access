import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AperturePhotometrySettingsComponent } from './aperture-photometry-settings.component';

describe('AperturePhotometrySettingsComponent', () => {
  let component: AperturePhotometrySettingsComponent;
  let fixture: ComponentFixture<AperturePhotometrySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AperturePhotometrySettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AperturePhotometrySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
