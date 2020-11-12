import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageCalculatorPageComponent } from './pixel-ops-panel.component';

describe('ImageCalculatorPageComponent', () => {
  let component: ImageCalculatorPageComponent;
  let fixture: ComponentFixture<ImageCalculatorPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageCalculatorPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageCalculatorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
