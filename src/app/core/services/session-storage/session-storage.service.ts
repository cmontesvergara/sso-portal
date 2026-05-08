import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService {
  keys = {
    lastUrl: 'LAST_URL_KEY',
    accessToken: 'x-access-token',
    refreshToken: 'x-refresh-token',
    signData: 'x-sign-data',
    v2AccessToken: 'v2-access-token',
    v2AuthMode: 'v2-auth-mode',
  };

  constructor() {}

  saveLastUrl(payload: string) {
    sessionStorage.setItem(this.keys.lastUrl, payload);
  }
  getLastUrl() {
    return sessionStorage.getItem(this.keys.lastUrl) ;
  }
  removeLastUrl() {
    sessionStorage.removeItem(this.keys.lastUrl);
  }
  saveAccessToken(payload: string) {
    sessionStorage.setItem(this.keys.accessToken, payload);
  }
  saveRefreshToken(payload: string) {
    sessionStorage.setItem(this.keys.refreshToken, payload);
  }
  getAccessToken() {
    return  sessionStorage.getItem(this.keys.accessToken) ;
  }
  getRefreshToken() {
    return  sessionStorage.getItem(this.keys.refreshToken) ;
  }
  removeAccessToken() {
    sessionStorage.removeItem(this.keys.accessToken);
  }
  removeRefreshToken() {
    sessionStorage.removeItem(this.keys.refreshToken);
  }
  saveSignData(payload: any) {
    sessionStorage.setItem(this.keys.signData, JSON.stringify(payload));
  }
  getSignData() {
    return JSON.parse(sessionStorage.getItem(this.keys.signData) || '{}');
  }
  removeSignData() {
    sessionStorage.removeItem(this.keys.signData);
  }

  // V2 token management
  saveV2AccessToken(token: string) {
    sessionStorage.setItem(this.keys.v2AccessToken, token);
  }
  getV2AccessToken(): string | null {
    return sessionStorage.getItem(this.keys.v2AccessToken);
  }
  removeV2AccessToken() {
    sessionStorage.removeItem(this.keys.v2AccessToken);
  }

  // V2 auth mode flag
  setV2AuthMode(enabled: boolean) {
    if (enabled) {
      sessionStorage.setItem(this.keys.v2AuthMode, 'true');
    } else {
      sessionStorage.removeItem(this.keys.v2AuthMode);
    }
  }
  isV2AuthMode(): boolean {
    return sessionStorage.getItem(this.keys.v2AuthMode) === 'true';
  }

  // Clear all auth data
  clearAll() {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.removeSignData();
    this.removeV2AccessToken();
    sessionStorage.removeItem(this.keys.v2AuthMode);
  }
}
