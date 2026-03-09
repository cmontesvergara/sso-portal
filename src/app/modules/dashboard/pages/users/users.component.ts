import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserManagementService, UserRow } from 'src/app/core/services/user-management.service';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
    users: UserRow[] = [];
    total: number = 0;
    take: number = 10;
    skip: number = 0;
    isLoading: boolean = false;
    error: string | null = null;
    searchTerm: string = '';

    constructor(private userManagementService: UserManagementService) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.isLoading = true;
        this.error = null;

        this.userManagementService.getUsers(this.skip, this.take, undefined, this.searchTerm).subscribe({
            next: (res) => {
                if (res.success) {
                    this.users = res.users;
                    this.total = res.total;
                } else {
                    this.error = 'No se pudo cargar la lista de usuarios.';
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error fetching users:', err);
                this.error = 'Ocurrió un error al intentar cargar los usuarios.';
                this.isLoading = false;
            }
        });
    }

    onPageChange(newSkip: number): void {
        this.skip = newSkip;
        this.loadUsers();
    }

    onSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTerm = value;
        this.skip = 0; // Reset pagination on search
        this.loadUsers();
    }
}
