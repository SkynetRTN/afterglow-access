import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OauthClientConsentPageComponent } from './oauth-client-consent-page.component';

describe('OauthClientConsentPageComponent', () => {
  let component: OauthClientConsentPageComponent;
  let fixture: ComponentFixture<OauthClientConsentPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OauthClientConsentPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OauthClientConsentPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
