import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SonifierPageComponent } from './sonifier-page.component';

describe('SonifierPageComponent', () => {
  let component: SonifierPageComponent;
  let fixture: ComponentFixture<SonifierPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SonifierPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SonifierPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
