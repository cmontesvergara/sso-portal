import { CommonModule, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { LoadingService } from './core/services/loading/loading.service';
import { ThemeService } from './core/services/theme/theme.service';
import { ResponsiveHelperComponent } from './shared/components/responsive-helper/responsive-helper.component';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [NgClass, RouterOutlet, ResponsiveHelperComponent, NgxSonnerToaster, CommonModule],
})
export class AppComponent {
  title = 'SSO Portal';

  constructor(
    public themeService: ThemeService,
    public loadingService: LoadingService

  ) { }
}
