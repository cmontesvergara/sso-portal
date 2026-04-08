import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { NgClass, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AvatarModule } from 'ngx-avatars';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { SessionStorageService } from 'src/app/core/services/session-storage/session-storage.service';
import { ThemeService } from '../../../../../core/services/theme/theme.service';
import { ClickOutsideDirective } from '../../../../../shared/directives/click-outside.directive';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss'],
  standalone: true,
  imports: [
    ClickOutsideDirective,
    NgClass,
    RouterLink,
    AngularSvgIconModule,
    AvatarModule,
    TitleCasePipe,
  ],
  animations: [
    trigger('openClose', [
      state(
        'open',
        style({
          opacity: 1,
          transform: 'translateY(0)',
          visibility: 'visible',
        }),
      ),
      state(
        'closed',
        style({
          opacity: 0,
          transform: 'translateY(-20px)',
          visibility: 'hidden',
        }),
      ),
      transition('open => closed', [animate('0.2s')]),
      transition('closed => open', [animate('0.2s')]),
    ]),
  ],
})
export class ProfileMenuComponent implements OnInit {
  public isOpen = false;
  public profileMenu: any[] = [];

  public themeColors = [
    {
      name: 'base',
      code: '#3b82f6', // if change this color, change it in ./styles.scss, --primary variable
    },
    {
      name: 'yellow',
      code: '#f59e0b',
    },
    {
      name: 'green',
      code: '#22c55e',
    },
    {
      name: 'blue',
      code: '#3b82f6',
    },
    {
      name: 'orange',
      code: '#ea580c',
    },
    {
      name: 'red',
      code: '#cc0022',
    },
    {
      name: 'violet',
      code: '#6d28d9',
    },
  ];

  public themeMode = ['light', 'dark'];
  userInformation: any = undefined;

  constructor(
    public themeService: ThemeService,
    private readonly authService: AuthService,
    private readonly sessionStorageService: SessionStorageService,
    private readonly router: Router,
  ) {
    this.authService.getProfile().subscribe((res) => {
      if (res && res.user) {
        this.userInformation = {
          name: `${res.user.firstName} ${res.user.lastName}`,
          email: res.user.email,
        };
      }
    });

    // Initialize menu actions
    this.profileMenu = [
      {
        title: 'Perfil',
        icon: './assets/icons/heroicons/outline/user-circle.svg',
        link: '/dashboard/profile',
        action: null,
      },
      {
        title: 'Cerrar sesión',
        icon: './assets/icons/heroicons/outline/logout.svg',
        link: null,
        action: () => this.logout(),
      },
    ];
  }

  logout() {
    const isV2 = this.sessionStorageService.isV2AuthMode();
    const logout$ = isV2 ? this.authService.logoutV2(true) : this.authService.logout();

    logout$.subscribe({
      next: () => {
        this.sessionStorageService.clearAll();
        this.router.navigate(['/auth/sign-in']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.sessionStorageService.clearAll();
        this.router.navigate(['/auth/sign-in']);
      }
    });
  }

  ngOnInit(): void { }

  public toggleMenu(): void {
    this.isOpen = !this.isOpen;
  }

  toggleThemeMode() {
    this.themeService.theme.update((theme) => {
      const mode = !this.themeService.isDark ? 'dark' : 'light';
      return { ...theme, mode: mode };
    });
  }

  toggleThemeColor(color: string) {
    this.themeService.theme.update((theme) => {
      return { ...theme, color: color };
    });
  }
}
