import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomMarkerPageComponent } from './custom-marker-page.component';

describe('CustomMarkerPageComponent', () => {
  let component: CustomMarkerPageComponent;
  let fixture: ComponentFixture<CustomMarkerPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomMarkerPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomMarkerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
