import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { toast } from 'ngx-sonner';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AngularSvgIconModule,
    ButtonComponent,
    CommonModule,

    ReactiveFormsModule,
  ],
  providers: [AuthService],
})
export class NewPasswordComponent implements OnInit {
  newPasswordForm!: FormGroup;
  token: string = '';
  disabledSendButton: boolean = false;
  passwordStrength: number = 0;
  passwordTextType!: boolean;
  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
  ) {
    this.newPasswordForm = this.fb.group({
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
          (control:any) => {
            return control.value ===
              this.newPasswordForm?.get('password')?.value
              ? null
              : { mismatch: true };
          },
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['token']) {
        this.token = params['token'];
      } else {
        this.disabledSendButton = true;
        toast.error('Url invalida.', {
          position: 'bottom-right',
          description: 'Solicite un correo de recuperación de contraseña.',
          action: {
            label: 'Solicitar',
            onClick: () => this.router.navigate(['/auth/forgot-password']),
          },
          actionButtonStyle: 'background-color:#000000; color:white;',
        });
      }
    });
  }

  onSubmit() {
    this.authService.validateEmailRecovery(this.newPasswordForm.value.password, this.token).subscribe(

      (response) => {
        toast.success('Contraseña actualizada correctamente.', {
          position: 'bottom-right',
          description: 'Inicie sesión con su nueva contraseña.',
        });
        this.router.navigate(['/auth/login']);
      },
      (error) => {
        toast.error('Error al actualizar la contraseña.', {
          position: 'bottom-right',
          description: 'Solicite un correo de recuperación de contraseña.',
          action: {
            label: 'Solicitar',
            onClick: () => this.router.navigate(['/auth/forgot-password']),
          },
          actionButtonStyle: 'background-color:#000000; color:white;',
        });
      }

    );
  }
  passwordStrongLevel() {
    const password = this.newPasswordForm.get('password')?.value;
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
  get f() {
    return this.newPasswordForm.controls;
  }
}
