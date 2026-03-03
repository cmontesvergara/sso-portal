import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-two-steps',
  templateUrl: './two-steps.component.html',
  styleUrls: ['./two-steps.component.scss'],
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonComponent, CommonModule],
  providers: [AuthService],
})
export class TwoStepsComponent implements OnInit {
  public inputs = Array(6);
  public otpCode: string = '';
  public isLoading: boolean = false;
  public userId: string = '';
  public name: string = '';
  public tempToken: string = ''; // JWT temporal para validación de 2FA
  public qrCode: string = '';
  public secret: string = '';
  public backupCodes: string[] = [];
  public showSetup: boolean = false;
  public isValidating: boolean = false; // true = validating existing OTP, false = setting up new OTP

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {
    // Get params from query params
    this.route.queryParams.subscribe(params => {
      this.userId = params['userId'] || '';
      this.name = params['name'] || '';
      this.tempToken = params['token'] || ''; // JWT temporal para validación
      this.isValidating = params['validate'] === 'true';

      if (!this.isValidating && this.userId && this.name) {
        // Setup mode: generate OTP
        this.generateOTP();
      }
    });
  }

  generateOTP(): void {
    this.isLoading = true;
    this.authService.generateOTP(this.userId, this.name).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.showSetup = true;
        this.qrCode = response.qrCode;
        this.secret = response.secret;
        this.backupCodes = response.backupCodes;
        toast.success('Código QR generado', {
          position: 'bottom-right',
          description: 'Escanea el código QR con tu aplicación de autenticación',
        });
      },
      error: (error: any) => {
        this.isLoading = false;
        toast.error('Error al generar OTP', {
          position: 'bottom-right',
          description: error?.message || 'Intenta nuevamente',
        });
      }
    });
  }

  onOtpChange(index: number, event: any): void {
    const value = event.target.value;
    if (value && index < 5) {
      const nextInput = event.target.nextElementSibling;
      if (nextInput) {
        nextInput.focus();
      }
    }
    this.updateOtpCode();
  }

  onOtpKeydown(index: number, event: any): void {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      const prevInput = event.target.previousElementSibling;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  updateOtpCode(): void {
    const inputs = document.querySelectorAll('.otp-input');
    this.otpCode = Array.from(inputs)
      .map((input: any) => input.value)
      .join('');
  }

  onSubmit(): void {
    if (this.otpCode.length !== 6) {
      toast.error('Código incompleto', {
        position: 'bottom-right',
        description: 'Por favor ingresa los 6 dígitos',
      });
      return;
    }

    this.isLoading = true;

    if (this.isValidating) {
      // Validate OTP during login - usa tempToken en lugar de userId
      this.authService.validateOTP(this.tempToken, this.otpCode).subscribe({
        next: (response: any) => {
          this.isLoading = false;

          // Guardar tokens en sessionStorage
          if (response.tokens) {
            sessionStorage.setItem('accessToken', response.tokens.accessToken);
            sessionStorage.setItem('refreshToken', response.tokens.refreshToken);
          }

          toast.success('Verificación exitosa', {
            position: 'bottom-right',
          });

          // Redirect to dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error: any) => {
          this.isLoading = false;
          toast.error('Código inválido', {
            position: 'bottom-right',
            description: error?.message || 'Verifica el código e intenta nuevamente',
          });
        }
      });
    } else {
      // Verify OTP during setup
      this.authService.verifyOTP(this.userId, this.otpCode).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          toast.success('OTP activado correctamente', {
            position: 'bottom-right',
            description: 'Tu autenticación de dos factores está activa',
          });
          setTimeout(() => {
            this.router.navigate(['/auth/sign-in']);
          }, 2000);
        },
        error: (error: any) => {
          this.isLoading = false;
          toast.error('Código inválido', {
            position: 'bottom-right',
            description: 'Verifica el código de tu aplicación',
          });
        }
      });
    }
  }
}
