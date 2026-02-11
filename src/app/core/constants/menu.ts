import { MenuItem } from '../models/menu.model';

export class Menu {
  public static pages: MenuItem[] = [
    {
      group: 'Modulos',
      separator: false,
      hidden: false,
      items: [
        {
          hidden: false,
          icon: 'assets/icons/heroicons/outline/wrench-screwdriver.svg',
          label: 'Administración',
          route: '/dashboard',
          children: [
            { label: 'Aplicaciones', route: '/dashboard/applications', hidden: false },
            { label: 'Organizaciones', route: '/dashboard/tenants', hidden: false },
          ],
        },
        {
          hidden: false,
          icon: 'assets/icons/heroicons/outline/chart-pie.svg',
          label: 'Dashboard',
          route: '/dashboard',
          children: [
            { label: 'Servicios', route: '/dashboard/home' },
            { label: 'Nfts', route: '/dashboard/nfts', hidden: true },
            { label: 'Podcast', route: '/dashboard/podcast', hidden: true },
          ],
        },
        {
          icon: 'assets/icons/heroicons/outline/lock-closed.svg',
          label: 'Mis Apps',
          route: '/apps',
          children: [
            { label: 'Search App', route: '/apps/gallery' },
            { label: 'Css Unit Changer', route: '/apps/css-unit-changer' },
            { label: 'File Renamer', route: '/apps/file-renamer' },
          ],
        },
        {
          hidden: true,
          icon: 'assets/icons/heroicons/outline/user.svg',
          label: 'Perfil',
          route: '/profile',
        },
        {
          hidden: true,
          icon: 'assets/icons/heroicons/outline/lock-closed.svg',
          label: 'Auth',
          route: '/auth',
          children: [
            { label: 'Sign up', route: '/auth/sign-up' },
            { label: 'Sign in', route: '/auth/sign-in' },
            { label: 'Forgot Password', route: '/auth/forgot-password' },
            { label: 'New Password', route: '/auth/new-password' },
            { label: 'Two Steps', route: '/auth/two-steps' },
          ],
        },
        {
          hidden: true,
          icon: 'assets/icons/heroicons/outline/exclamation-triangle.svg',
          label: 'Errors',
          route: '/errors',
          children: [
            { label: '404', route: '/errors/404' },
            { label: '500', route: '/errors/500' },
          ],
        },
        {
          hidden: true,
          icon: 'assets/icons/heroicons/outline/cube.svg',
          label: 'Components',
          route: '/components',
          children: [{ label: 'Table', route: '/components/table' }],
        },
      ],
    },
    {
      group: 'Collaboration',
      separator: true,
      hidden: false,
      items: [
        {
          label: 'Descubre Apps',
          icon: 'assets/icons/heroicons/outline/globe-alt.svg',
          route: '/dashboard/util/app-gallery',
        },
        {
          icon: 'assets/icons/heroicons/outline/download.svg',
          label: 'Download',
          route: '/download',
          hidden: true,
        },
        {
          icon: 'assets/icons/heroicons/outline/gift.svg',
          label: 'Gift Card',
          route: '/gift',
          hidden: true,
        },
        {
          icon: 'assets/icons/heroicons/outline/users.svg',
          label: 'Users',
          route: '/users',
          hidden: true,
        },
      ],
    },

    {
      group: 'Administración',
      separator: true,
      hidden: true,
      items: [
        {
          hidden: false,
          icon: 'assets/icons/heroicons/outline/wrench-screwdriver.svg',
          label: 'Administración',
          route: '/dashboard',
          children: [
            { label: 'Aplicaciones', route: '/dashboard/applications', hidden: false },
            { label: 'Organizaciones', route: '/dashboard/tenants', hidden: false },
            { label: 'Roles', route: '/dashboard/roles', hidden: false },
          ],
        },
      ],
    },
    {
      group: 'Config',
      separator: false,
      hidden: true,
      items: [
        {
          icon: 'assets/icons/heroicons/outline/cog.svg',
          label: 'Settings',
          route: '/settings',
        },
        {
          icon: 'assets/icons/heroicons/outline/bell.svg',
          label: 'Notifications',
          route: '/gift',
        },
        {
          icon: 'assets/icons/heroicons/outline/folder.svg',
          label: 'Folders',
          route: '/folders',
          children: [
            { label: 'Current Files', route: '/folders/current-files' },
            { label: 'Downloads', route: '/folders/download' },
            { label: 'Trash', route: '/folders/trash' },
          ],
        },
      ],
    },
  ];
}
