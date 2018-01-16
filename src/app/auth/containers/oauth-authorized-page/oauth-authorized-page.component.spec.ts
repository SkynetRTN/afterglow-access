import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OauthAuthorizedPageComponent } from './oauth-authorized-page.component';

describe('OauthAuthorizedPageComponent', () => {
  let component: OauthAuthorizedPageComponent;
  let fixture: ComponentFixture<OauthAuthorizedPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OauthAuthorizedPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OauthAuthorizedPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
