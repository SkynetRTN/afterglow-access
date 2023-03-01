import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CosmeticCorrectionPanelComponent } from './cosmetic-correction-panel.component';

describe('CosmeticCorrectionPanelComponent', () => {
  let component: CosmeticCorrectionPanelComponent;
  let fixture: ComponentFixture<CosmeticCorrectionPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CosmeticCorrectionPanelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CosmeticCorrectionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
