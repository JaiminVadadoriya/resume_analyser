import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Angular 22: paramsInheritanceStrategy now defaults to 'always'.
    // Explicitly set 'emptyOnly' to preserve the previous v21 behavior.
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })),
    provideAnimationsAsync()
  ]
};
