import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomMarkerToolsetComponent } from './custom-marker-toolset.component';

describe('CustomMarkerPageComponent', () => {
  let component: CustomMarkerToolsetComponent;
  let fixture: ComponentFixture<CustomMarkerToolsetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CustomMarkerToolsetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomMarkerToolsetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
