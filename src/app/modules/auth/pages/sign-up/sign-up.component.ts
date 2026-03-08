import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { toast } from 'ngx-sonner';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { SessionStorageService } from 'src/app/core/services/session-storage/session-storage.service';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule,
    ButtonComponent,
    CommonModule,
  ],
  providers: [AuthService],
})
export class SignUpComponent implements OnInit {
  signUpForm!: FormGroup;
  passwordStrength: number = 0;

  passwordTextType!: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly sessionStorageService: SessionStorageService,
  ) {
    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      last_name: ['', [Validators.required, Validators.minLength(3)]],
      second_last_name: ['', [Validators.minLength(3)]],
      nit: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(10),
        ],
      ],
      phone: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10),
          Validators.pattern(/^3/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(16),
          Validators.pattern(/^[A-Za-z0-9!@#$%^&*()_+{}\[\]:;"<>,.?/~`-]+$/),
        ],
      ],
      confirmPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(16),
          Validators.pattern(/^[A-Za-z0-9!@#$%^&*()_+{}\[\]:;"<>,.?/~`-]+$/),
        ],
      ],
      acceptTerms: [false, Validators.requiredTrue],
    });

    this.signUpForm.get('phone')?.valueChanges.subscribe((value) => {
      this.sanitizedNumberField('phone', value);
    });
    this.signUpForm.get('nit')?.valueChanges.subscribe((value) => {
      this.sanitizedNumberField('nit', value);
    });
    this.signUpForm.get('name')?.valueChanges.subscribe((value) => {
      this.sanitizedTextField('name', value);
    });
    this.signUpForm.get('last_name')?.valueChanges.subscribe((value) => {
      this.sanitizedTextField('last_name', value);
    });
  }
  sanitizedNumberField(fieldName: string, value: string) {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    if (value !== sanitizedValue) {
      this.signUpForm
        .get(fieldName)
        ?.setValue(sanitizedValue, { emitEvent: false });
    }
  }
  sanitizedTextField(fieldName: string, value: string) {
    const sanitizedValue = value.replace(/[^A-Za-z]/g, '');
    if (value !== sanitizedValue) {
      this.signUpForm
        .get(fieldName)
        ?.setValue(sanitizedValue, { emitEvent: false });
    }
  }

  ngOnInit(): void {
    this.signUpForm.valueChanges.subscribe(() => {
      console.log(this.signUpForm);
    });
  }

  get f() {
    return this.signUpForm.controls;
  }
  onSubmit() {
    if (
      this.signUpForm.value.password ===
      this.signUpForm.value.confirmPassword &&
      this.signUpForm.value.acceptTerms &&
      this.signUpForm.valid
    ) {
      if (this.signUpForm.value.last_name.trim().includes(' ')) {
        const [last_name, second_last_name] = this.signUpForm.value.last_name
          .trim()
          .split(' ');
        this.signUpForm.value.last_name = last_name;
        this.signUpForm.value.second_last_name = second_last_name;
      }

      const payload = {
        firstName: this.signUpForm.value.name.trim().toUpperCase(),
        lastName: this.signUpForm.value.last_name.trim().toUpperCase(),
        secondLastName: this.signUpForm.value?.second_last_name
          ?.trim()
          ?.toUpperCase(),
        phone: this.signUpForm.value.phone.trim(),
        email: this.signUpForm.value.email.trim().toLowerCase(),
        nuid: this.signUpForm.value.nit.trim(),
        password: this.signUpForm.value.confirmPassword.trim(),
      };

      this.authService.signUp(payload).subscribe(
        (res: any) => {
          const userId = res?.user?.userId;
          const email = payload.email;

          if (userId) {
            this.authService.sendEmailOtpCode(email, userId).subscribe({
              next: () => {
                const encodedUserId = btoa(userId);
                this.router.navigate(['/auth/email-verification'], {
                  queryParams: { email, userId: encodedUserId, codeSent: 'true' }
                });
              },
              error: () => {
                // Si falla el envío inicial, redirigir igualmente para que puedan reintentar
                const encodedUserId = btoa(userId);
                this.router.navigate(['/auth/email-verification'], {
                  queryParams: { email, userId: encodedUserId }
                });
              }
            });
          } else {
            this.router.navigate(['/auth/sign-in'], { queryParams: { nit: email } });
          }
        },
        (err) => {
          toast.error('Ocurrio un error.', {
            position: 'bottom-right',
            description: err.message || 'Vuelva a intentarlo.',
          });
          console.log(err);
        },
      );
    } else {
      console.log('Form invalid');
    }
  }
  passwordStrongLevel() {
    const password = this.signUpForm.get('password')?.value;
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
}
