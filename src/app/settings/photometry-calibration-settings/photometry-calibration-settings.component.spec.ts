import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotometryCalibrationSettingsComponent } from './photometry-calibration-settings.component';

describe('PhotometryCalibrationSettingsComponent', () => {
  let component: PhotometryCalibrationSettingsComponent;
  let fixture: ComponentFixture<PhotometryCalibrationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhotometryCalibrationSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotometryCalibrationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
