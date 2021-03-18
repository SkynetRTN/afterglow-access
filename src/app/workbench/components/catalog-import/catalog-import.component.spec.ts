import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogImportComponent } from './catalog-import.component';

describe('CatalogImportComponent', () => {
  let component: CatalogImportComponent;
  let fixture: ComponentFixture<CatalogImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CatalogImportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CatalogImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
