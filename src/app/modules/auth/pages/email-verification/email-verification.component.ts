import { CommonModule, } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { LoadingService } from 'src/app/core/services/loading/loading.service';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss'],
  standalone: true,
  imports: [FormsModule, ButtonComponent, CommonModule, RouterModule],
  providers: [AuthService],
})
export class EmailVerificationComponent implements OnInit {
  email: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  encodedUserId: string | null = null;

  // Manual code verification
  codeSent: boolean = false;
  verificationCode: string = '';
  isVerifying: boolean = false;
  verifyErrorMessage: string = '';
  verifySuccessMessage: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public loadingService: LoadingService,
  ) {
    setTimeout(() => {
      this.loadingService.loading = false;

    }, 1000);
  }

  ngOnInit(): void {
    // Get userId from query params
    this.route.queryParams.subscribe(params => {
      this.encodedUserId = params['userId'] || null;
    });
  }

  requestVerificationCode() {
    if (!this.email || !this.email.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo electrónico';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Use the encodedUserId from URL if available
    let userId = null;

    try {
      userId = this.encodedUserId ? atob(this.encodedUserId) : null;
    } catch (error) {
      console.error('Error decoding userId:', error);
    } if (!userId) {
      this.isLoading = false;
      this.errorMessage = 'Error al enviar el código de verificación. Por favor verifica tu correo.';
      return;
    }
    this.authService.sendEmailOtpCode(this.email, userId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = 'Se ha enviado un correo de verificación. Revisa tu bandeja de entrada.';
        this.codeSent = true;
      },
      error: (error: any) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = 'Error al enviar el código de verificación. Redirigiendo al login...';
          setTimeout(() => {
            this.router.navigate(['/auth/sign-in']);
          }, 5000);
        } else {
          this.successMessage = 'Si hay una cuenta vinculada a este correo, se enviará un correo de verificación.';
          this.codeSent = true;
        }
        this.email = '';
      }
    });
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
        this.verifySuccessMessage = '¡Correo verificado exitosamente! Redirigiendo al inicio de sesión...';
        setTimeout(() => {
          this.router.navigate(['/auth/sign-in']);
        }, 3000);
      },
      error: (error: any) => {
        this.isVerifying = false;
        if (error.status === 401) {
          this.verifyErrorMessage = 'El código es inválido o ha expirado. Verifica e intenta de nuevo.';
        } else {
          this.verifyErrorMessage = 'Ocurrió un error al verificar. Intenta de nuevo.';
        }
      }
    });
  }
}

