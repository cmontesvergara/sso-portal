import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toast } from 'ngx-sonner';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../../../core/services/auth/auth.service';

/** Validator que comprueba que password y confirmPassword sean iguales */
const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const pwd = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (pwd && confirm && pwd !== confirm) {
    control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  const existing = control.get('confirmPassword')?.errors;
  if (existing?.['passwordMismatch']) {
    const { passwordMismatch, ...rest } = existing;
    control.get('confirmPassword')?.setErrors(Object.keys(rest).length ? rest : null);
  }
  return null;
};

@Component({
  selector: 'app-iframe-sign-up',
  templateUrl: './iframe-sign-up.component.html',
  styleUrls: ['./iframe-sign-up.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CommonModule,
  ],
  providers: [AuthService],
})
export class IframeSignUpComponent implements OnInit {
  // Multi-step form
  currentStep: number = 0;
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;

  // Step 0 variables
  appName: string = 'TU APP';

  // Step 4 variables
  registeredEmail: string = '';
  registeredUserId: string = '';
  verificationCode: string = '';
  isVerifying: boolean = false;
  isVerified: boolean = false;
  isResending: boolean = false;
  verifyErrorMessage: string = '';
  verifySuccessMessage: string = '';

  passwordStrength: number = 0;
  passwordTextType: boolean = false;
  isSubmitting: boolean = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    // Step 1: Personal Info
    this.step1Form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      document: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(11),
        Validators.pattern(/^[0-9]+$/),
      ]],
    });

    // Step 2: Contact Info
    this.step2Form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^3/),
      ]],
    });

    // Step 3: Password
    this.step3Form = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/),
      ]],
      confirmPassword: ['', [
        Validators.required,
        Validators.minLength(8),
      ]],
      acceptTerms: [false, Validators.requiredTrue],
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['appName']) {
        this.appName = params['appName'];
      }
    });
  }

  get f() {
    return this.step3Form.controls;
  }

  // Navigation between steps
  nextStep() {
    // Step 0 is introduction, just go to step 1
    if (this.currentStep === 0) {
      this.currentStep++;
      return;
    }

    let currentForm: FormGroup;

    switch (this.currentStep) {
      case 1:
        currentForm = this.step1Form;
        break;
      case 2:
        currentForm = this.step2Form;
        break;
      default:
        return;
    }

    if (currentForm.valid) {
      this.currentStep++;
    } else {
      // Mark all fields as touched to show errors
      Object.keys(currentForm.controls).forEach(key => {
        currentForm.get(key)?.markAsTouched();
      });
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Final submission
  onSubmit() {
    if (this.step3Form.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      // Combina datos de todos los pasos
      const payload = {
        firstName: this.step1Form.value.firstName.trim().toUpperCase(),
        lastName: this.step1Form.value.lastName.trim().toUpperCase(),
        nuid: this.step1Form.value.document.trim(),
        email: this.step2Form.value.email.trim().toLowerCase(),
        phone: this.step2Form.value.phone.trim(),
        password: this.step3Form.value.password,
        tenantId: environment.tenantId,  // requerido por /api/v2/users/register
      };

      this.authService.registerV2(payload).subscribe({
        next: (res: any) => {
          // La v2 devuelve { id, email, firstName, ... } directamente
          const userId = res?.id;
          const email = payload.email;

          this.isSubmitting = false;

          // Notificar al iframe padre si aplica
          if (window.self !== window.top) {
            window.parent.postMessage({
              type: 'REGISTRATION_SUCCESS',
              userId: userId,
              email: email
            }, '*');
          }

          if (userId) {
            // El backend ya envía el email de bienvenida; mostrar el paso 4
            this.registeredEmail = email;
            this.registeredUserId = userId;
            this.currentStep = 4;
          } else {
            this.router.navigate(['/auth/sign-in'], { queryParams: { email } });
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          const msg = err?.error?.message || err?.message || 'Por favor intenta de nuevo.';
          toast.error('Error al registrarse', {
            position: 'bottom-center',
            description: msg,
          });
        },
      });
    } else {
      // Mostrar errores de validación
      Object.keys(this.step3Form.controls).forEach(key => {
        this.step3Form.get(key)?.markAsTouched();
      });
    }
  }

  passwordStrongLevel() {
    const password = this.step3Form.get('password')?.value || '';
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    this.passwordStrength = strength;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  verifyManualCode() {
    if (!this.verificationCode || !this.verificationCode.trim()) {
      this.verifyErrorMessage = 'Por favor ingresa el código de verificación';
      return;
    }

    this.isVerifying = true;
    this.verifyErrorMessage = '';
    this.verifySuccessMessage = '';

    this.authService.verifyEmailToken(this.verificationCode.trim()).subscribe({
      next: (response: any) => {
        this.isVerifying = false;
        this.isVerified = true;

        // Notificar al iframe padre del éxito
        if (window.self !== window.top) {
          window.parent.postMessage({
            type: 'VERIFICATION_SUCCESS',
            email: this.registeredEmail
          }, '*');
        } else {
          setTimeout(() => {
            this.router.navigate(['/auth/sign-in'], { queryParams: { email: this.registeredEmail } });
          }, 3000);
        }
      },
      error: (error: any) => {
        this.isVerifying = false;
        if (error.status === 401 || error.status === 400) {
          this.verifyErrorMessage = 'El código es inválido o ha expirado. Verifica e intenta de nuevo.';
        } else {
          this.verifyErrorMessage = 'Ocurrió un error al verificar. Intenta de nuevo.';
        }
      }
    });
  }

  finishWithoutVerification() {
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'REGISTRATION_FINISHED_UNVERIFIED',
        email: this.registeredEmail
      }, '*');
    } else {
      this.router.navigate(['/auth/sign-in'], { queryParams: { email: this.registeredEmail } });
    }
  }

  resendCode() {
    if (!this.registeredEmail || !this.registeredUserId || this.isResending) return;

    this.isResending = true;
    this.verifyErrorMessage = '';
    this.verifySuccessMessage = '';

    this.authService.sendEmailOtpCode(this.registeredEmail, this.registeredUserId).subscribe({
      next: () => {
        this.isResending = false;
        this.verifySuccessMessage = 'Se ha enviado un nuevo código a tu correo.';
        setTimeout(() => this.verifySuccessMessage = '', 4000);
      },
      error: () => {
        this.isResending = false;
        this.verifyErrorMessage = 'No se pudo reenviar el código. Intenta de nuevo más tarde.';
      }
    });
  }
}