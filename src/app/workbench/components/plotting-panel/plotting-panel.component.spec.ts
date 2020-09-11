import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlottingPanelComponent } from './plotting-panel.component';

describe('PlotterPageComponent', () => {
  let component: PlottingPanelComponent;
  let fixture: ComponentFixture<PlottingPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlottingPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlottingPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
