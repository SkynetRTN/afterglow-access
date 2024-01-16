import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WcsCalibrationSettingsComponent } from './wcs-calibration-settings.component';

describe('SourceExtractionSettingsComponent', () => {
  let component: WcsCalibrationSettingsComponent;
  let fixture: ComponentFixture<WcsCalibrationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WcsCalibrationSettingsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WcsCalibrationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
