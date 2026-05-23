import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    CommonModule,
    ReactiveFormsModule,
  ],
  providers: [AuthService],
})
export class ForgotPasswordComponent implements OnInit {
  email: string = '';
  disabledSendButton: boolean = false;
  constructor(private readonly authService: AuthService,private readonly router:Router) {}

  ngOnInit(): void {

  }
  onSubmit() {

    this.authService.sendEmailRecovery(this.email).subscribe(
      (response: any) => {
        this.disabledSendButton = true
        console.log(response);
        const msg = 'Operación exitosa';
        toast.success(msg, {
          position: 'bottom-right',
          description:
            'Si el documento es válido, recibirá un correo de recuperación.',
        });
        setTimeout(() => {
          this.router.navigate(['/auth/sign-in']);
        }, 2000);
      },
      (error: any) => {
        console.error(error);
        const msg = 'La operación no se pudo completar';
        toast.error(msg, {
          position: 'bottom-right',
          description: 'Intente mas tarde.',
          action: {
            label: 'Salir',
            onClick: () => this.router.navigate(['/auth/sign-in']),
          },
          actionButtonStyle: 'background-color:#DC2626; color:white;',
        });
      },
    );
  }
}
