import { Component, OnInit } from '@angular/core';

import { Player } from '../../shared/interfaces/player.interface';
import { AnalyticsService } from '../../shared/providers/analytics.service';
import { ExternalService } from '../../shared/providers/external.service';
import { LogMonitorService } from '../../shared/providers/log-monitor.service';
import { PartyService } from '../../shared/providers/party.service';

@Component({
  selector: 'app-inspect-players',
  templateUrl: './inspect-players.component.html',
  styleUrls: ['./inspect-players.component.scss']
})
export class InspectPlayersComponent implements OnInit {
  genericPlayers: Player[] = [];
  constructor(
    public partyService: PartyService,
    private logMonitorService: LogMonitorService,
    private externalService: ExternalService,
    private analyticsService: AnalyticsService
  ) {


  }
  ngOnInit() {
    this.analyticsService.sendScreenview('/authorized/inspect-players');
    this.partyService.genericPlayers.subscribe(res => {
      this.genericPlayers = res;
    });
    this.partyService.selectedGenericPlayer.next(this.partyService.genericPartyPlayers[0]);
  }
}
