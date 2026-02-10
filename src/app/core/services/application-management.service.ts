import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  Application,
  CreateApplicationDto,
  UpdateApplicationDto,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ApplicationManagementService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get all applications (system admin only)
   */
  getAllApplications(): Observable<{
    success: boolean;
    applications: Application[];
  }> {
    return this.http.get<{ success: boolean; applications: Application[] }>(
      `${this.baseUrl}/api/v1/applications`,
      { withCredentials: true },
    );
  }

  /**
   * Get single application by ID
   */
  getApplication(
    id: string,
  ): Observable<{ success: boolean; application: Application }> {
    return this.http.get<{ success: boolean; application: Application }>(
      `${this.baseUrl}/api/v1/applications/${id}`,
      { withCredentials: true },
    );
  }

  /**
   * Create new application (system admin only)
   */
  createApplication(
    data: CreateApplicationDto,
  ): Observable<ApiResponse<Application>> {
    return this.http.post<ApiResponse<Application>>(
      `${this.baseUrl}/api/v1/applications`,
      data,
      { withCredentials: true },
    );
  }

  /**
   * Update application (system admin only)
   */
  updateApplication(
    id: string,
    data: UpdateApplicationDto,
  ): Observable<ApiResponse<Application>> {
    return this.http.put<ApiResponse<Application>>(
      `${this.baseUrl}/api/v1/applications/${id}`,
      data,
      { withCredentials: true },
    );
  }

  /**
   * Delete application (super admin only)
   */
  deleteApplication(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.baseUrl}/api/v1/applications/${id}`,
      { withCredentials: true },
    );
  }

  /**
   * Get applications by appId
   */
  getApplicationByAppId(
    appId: string,
  ): Observable<{ success: boolean; application: Application }> {
    return this.http.get<{ success: boolean; application: Application }>(
      `${this.baseUrl}/api/v1/applications/by-app-id/${appId}`,
      { withCredentials: true },
    );
  }

  /**
   * Sync resources for an application
   */
  syncResources(appId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/api/v1/applications/${appId}/sync-resources`,
      {},
      { withCredentials: true },
    );
  }
}
