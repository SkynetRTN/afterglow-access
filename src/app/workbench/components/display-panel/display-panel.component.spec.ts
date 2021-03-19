import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayToolPanelComponent } from './display-panel.component';

describe('ViewerPageComponent', () => {
  let component: DisplayToolPanelComponent;
  let fixture: ComponentFixture<DisplayToolPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DisplayToolPanelComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayToolPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
