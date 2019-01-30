import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/browser';

@Injectable()
export class LogService {

  logger: any;
  public lastMessage: string;
  public lastError: boolean;

  constructor() {

    if (this.isElectron()) {

      this.logger = window.require('electron-log');
      // Disables electron-log console logging
      this.logger.transports.console = function (msg) { };
    }
  }

  log(message: any, data: any = '', error: boolean = false) {
    if (this.isElectron()) {

      this.lastMessage = message;
      this.lastError = error;
      if (!error) {
        this.logger.info(message);
        console.log(`[INFO] ${message}`, data);
      } else {
        this.logger.error(message);
        Sentry.captureException(message);
        console.log(`[ERROR] ${message}`, data);
      }
    }
  }

  isElectron() {
    return window && window.process && window.process.type;
  }
}
