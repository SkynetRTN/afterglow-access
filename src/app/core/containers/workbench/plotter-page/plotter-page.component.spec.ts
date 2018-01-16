import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotterPageComponent } from './plotter-page.component';

describe('PlotterPageComponent', () => {
  let component: PlotterPageComponent;
  let fixture: ComponentFixture<PlotterPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlotterPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
