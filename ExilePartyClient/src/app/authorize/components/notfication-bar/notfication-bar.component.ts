import { Component, Input, OnInit } from '@angular/core';

import { GithubRelease } from '../../../shared/interfaces/github.interface';
import { ExternalService } from '../../../shared/providers/external.service';




@Component({
  selector: 'app-notfication-bar',
  templateUrl: './notfication-bar.component.html',
  styleUrls: ['./notfication-bar.component.scss']
})

export class NotficationBarComponent implements OnInit {

  @Input() appVersion: string;
  public latestVersion;
  public notifications: string[] = [];

  constructor(
    private externalService: ExternalService
  ) {
    this.checkForNewRelease();
    setInterval(this.checkForNewRelease(), 1000 * 60 * 10); // Check every 10 minutes.
  }

  ngOnInit() {
  }


  checkForNewRelease() {
    this.externalService.getLatestRelease().subscribe((release: GithubRelease) => {
      console.log('Current Version: ', this.appVersion);
      console.log('Latest Version: ', release.name);

      if (this.appVersion < release.name) {
        if (this.notifications.indexOf('NEW_VERSION') === -1) {
          this.notifications.push('NEW_VERSION');
        }
      }

      this.latestVersion = release.name;
    });
  }

}
