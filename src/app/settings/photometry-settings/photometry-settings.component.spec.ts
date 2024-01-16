import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotometrySettingsComponent } from './photometry-settings.component';

describe('AperturePhotometrySettingsComponent', () => {
  let component: PhotometrySettingsComponent;
  let fixture: ComponentFixture<PhotometrySettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PhotometrySettingsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotometrySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
