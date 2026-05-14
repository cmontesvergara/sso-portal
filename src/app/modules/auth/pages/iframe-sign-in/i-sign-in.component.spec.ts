import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IFrameSignInComponent } from './i-sign-in.component';

describe('IFrameSignInComponent', () => {
  let component: IFrameSignInComponent;
  let fixture: ComponentFixture<IFrameSignInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IFrameSignInComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IFrameSignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
