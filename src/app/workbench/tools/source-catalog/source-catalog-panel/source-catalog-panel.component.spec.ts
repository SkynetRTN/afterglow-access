import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceCatalogPanelComponent } from './source-catalog-panel.component';

describe('SourcePanelComponent', () => {
  let component: SourceCatalogPanelComponent;
  let fixture: ComponentFixture<SourceCatalogPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SourceCatalogPanelComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceCatalogPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
