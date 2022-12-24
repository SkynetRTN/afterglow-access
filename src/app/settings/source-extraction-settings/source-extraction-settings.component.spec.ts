import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceExtractionSettingsComponent } from './source-extraction-settings.component';

describe('SourceExtractionSettingsComponent', () => {
  let component: SourceExtractionSettingsComponent;
  let fixture: ComponentFixture<SourceExtractionSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SourceExtractionSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceExtractionSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
