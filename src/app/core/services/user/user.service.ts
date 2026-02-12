import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { SessionStorageService } from '../session-storage/session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  baseUrl = environment.baseUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly sessionStorageService: SessionStorageService,
  ) { }

  getUserInformation() {
    return this.http.get(`${this.baseUrl}/api/v1/user/get_information`, {
      headers: {
        'x-access-token': this.sessionStorageService.getAccessToken() || '',
      },
    });
  }
  updateUserInformation(payload: any) {
    return this.http.put(
      `${this.baseUrl}/api/v1/user/update_information`,
      {
        user: {
          basic_information: payload,
        },
      },
      {
        headers: {
          'x-access-token': this.sessionStorageService.getAccessToken() || '',
        },
      },
    );
  }
}
