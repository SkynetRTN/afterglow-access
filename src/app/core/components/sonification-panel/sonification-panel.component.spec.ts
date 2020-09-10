import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SonificationPanelComponent } from './sonification-panel.component';

describe('SonifierPageComponent', () => {
  let component: SonificationPanelComponent;
  let fixture: ComponentFixture<SonificationPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SonificationPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SonificationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
