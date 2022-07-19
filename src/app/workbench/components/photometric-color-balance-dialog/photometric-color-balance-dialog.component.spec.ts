import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotometricColorBalanceDialogComponent } from './photometric-color-balance-dialog.component';

describe('PhotometricColorBalanceDialogComponent', () => {
  let component: PhotometricColorBalanceDialogComponent;
  let fixture: ComponentFixture<PhotometricColorBalanceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhotometricColorBalanceDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotometricColorBalanceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
