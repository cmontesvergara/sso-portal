import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

interface RuntimeEnv {
    API_BASE_URL?: string;
    SENTRY_DSN?: string;
    [key: string]: string | undefined;
}

declare global {
    interface Window {
        env?: RuntimeEnv;
    }
}

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
    private env: RuntimeEnv;

    constructor() {
        this.env = window.env ?? {};
    }

    get(key: keyof RuntimeEnv): string {
        const value = this.env[key];
        if (!value) {
            throw new Error(`Missing runtime config variable: ${String(key)}`);
        }
        return value;
    }

    getOptional(key: keyof RuntimeEnv): string | undefined {
        return this.env[key];
    }

    get apiBaseUrl(): string {
        return this.getOptional('API_BASE_URL') ?? environment.baseUrl;
    }
}
