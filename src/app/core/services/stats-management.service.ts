import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface StatsResponseDTO {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    deletedUsers: number;

    totalApps: number;
    activeApps: number;

    activeSsoSessions: number;
    activeAppSessions: number;
}

export interface GetStatsResponse {
    success: boolean;
    stats: StatsResponseDTO;
}

@Injectable({
    providedIn: 'root',
})
export class StatsManagementService {
    private readonly baseUrl = environment.baseUrl;

    constructor(private http: HttpClient) { }

    getGlobalStats(): Observable<GetStatsResponse> {
        return this.http.get<GetStatsResponse>(`${this.baseUrl}/api/v1/stats`, {
            withCredentials: true,
        });
    }
}
