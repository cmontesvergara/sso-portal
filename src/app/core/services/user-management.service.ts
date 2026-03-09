import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface UserRow {
    id: string;
    email: string;
    firstName: string;
    secondName: string | null;
    lastName: string;
    secondLastName: string | null;
    phone: string;
    nuid: string;
    userStatus: string;
    createdAt: string;
    updatedAt: string;
}

export interface ListUsersResponse {
    success: boolean;
    users: UserRow[];
    total: number;
    skip: number;
    take: number;
}

@Injectable({
    providedIn: 'root',
})
export class UserManagementService {
    private readonly baseUrl = environment.baseUrl;

    constructor(private http: HttpClient) { }

    getUsers(
        skip: number = 0,
        take: number = 10,
        status?: string,
        search?: string
    ): Observable<ListUsersResponse> {
        let params = new HttpParams().set('skip', skip).set('take', take);

        if (status) {
            params = params.set('status', status);
        }
        if (search) {
            params = params.set('search', search);
        }

        return this.http.get<ListUsersResponse>(`${this.baseUrl}/user/list`, {
            params,
        });
    }
}
