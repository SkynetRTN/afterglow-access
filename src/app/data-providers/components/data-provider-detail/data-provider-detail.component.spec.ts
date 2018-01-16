import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DataProviderDetailComponent } from './data-provider-detail.component';

describe('DataProviderDetailComponent', () => {
  let component: DataProviderDetailComponent;
  let fixture: ComponentFixture<DataProviderDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DataProviderDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataProviderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
