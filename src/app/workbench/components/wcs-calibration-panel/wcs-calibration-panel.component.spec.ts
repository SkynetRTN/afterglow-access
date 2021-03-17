import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WcsCalibrationPanelComponent } from './wcs-calibration-panel.component';

describe('WcsCalibrationPanelComponent', () => {
  let component: WcsCalibrationPanelComponent;
  let fixture: ComponentFixture<WcsCalibrationPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WcsCalibrationPanelComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WcsCalibrationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
