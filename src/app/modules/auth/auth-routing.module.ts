import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { emailTokenValidationGuard } from 'src/app/core/guards/email-token-validation/email-token-validation.guard';
import { emailVerificationGuard } from 'src/app/core/guards/email-verification/email-verification.guard';
import { logOutGuard } from 'src/app/core/guards/log-out/log-out.guard';
import { twoFactorTokenGuard } from 'src/app/core/guards/two-factor-token/two-factor-token.guard';
import { AuthComponent } from './auth.component';
import { EmailVerificationValidateComponent } from './pages/email-verification-validate/email-verification-validate.component';
import { EmailVerificationComponent } from './pages/email-verification/email-verification.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { NewPasswordComponent } from './pages/new-password/new-password.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { TwoStepsComponent } from './pages/two-steps/two-steps.component';
import { IframeSignUpComponent } from './pages/iframe-sign-up/iframe-sign-up.component';
import { IFrameSignInComponent } from './pages/iframe-sign-in/i-sign-in.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
      {
        path: 'sign-in',
        component: SignInComponent,
        data: { returnUrl: window.location.pathname },
      },
      {
        path: 'i-sign-in',
        component: IFrameSignInComponent,
        data: { returnUrl: window.location.pathname },
      },
      {
        path: 'sign-out',
        component: SignInComponent,
        canActivate: [logOutGuard],
      },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'new-password', component: NewPasswordComponent },
      { path: 'reset-password', component: NewPasswordComponent },
      {
        path: 'two-steps',
        component: TwoStepsComponent,
        canActivate: [twoFactorTokenGuard],
      },
      {
        path: 'email-verification',
        component: EmailVerificationComponent,
        canActivate: [emailVerificationGuard],
      },
      {
        path: 'verify-email',
        component: EmailVerificationValidateComponent,
        canActivate: [emailTokenValidationGuard],
      },
      {
        path: 'iframe-sign-up',
        component: IframeSignUpComponent,
      },
      { path: '**', redirectTo: 'sign-in', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule { }
