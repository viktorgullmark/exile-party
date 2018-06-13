import { Component, OnInit } from '@angular/core';

import { AccountInfo } from '../../../shared/interfaces/account-info.interface';
import { EquipmentResponse } from '../../../shared/interfaces/equipment-response.interface';
import { LogMessage } from '../../../shared/interfaces/log-message.interface';
import { Player } from '../../../shared/interfaces/player.interface';
import { ExternalService } from '../../../shared/providers/external.service';
import { LogMonitorService } from '../../../shared/providers/log-monitor.service';
import { PartyService } from '../../../shared/providers/party.service';

interface RecentPlayer {
  name: string;
  invited: boolean;
}

@Component({
  selector: 'app-recent-players',
  templateUrl: './recent-players.component.html',
  styleUrls: ['./recent-players.component.scss']
})

export class RecentPlayersComponent implements OnInit {



  recentPlayers: RecentPlayer[] = [
    { name: 'KraniumISC', invited: false}
  ];

  constructor(
    private partyService: PartyService,
    private logMonitorService: LogMonitorService,
    private externalService: ExternalService
  ) {
    this.logMonitorService.areaJoin.subscribe((msg: LogMessage) => {
      this.handleAreaEvent(msg);
    });
    this.logMonitorService.areaLeft.subscribe((msg: LogMessage) => {
      this.handleAreaEvent(msg);
    });
  }

  handleAreaEvent(event) {
    this.partyService.getAccountForCharacter(event.player.name).then((account: string) => {
      if (account !== null) {
        const newPlayer: RecentPlayer = {
          name: event.player.name,
          invited: false
        };

        this.recentPlayers.unshift(newPlayer);
        if (this.recentPlayers.length > 6) {
          this.recentPlayers.splice(-1, 1);
        }
      }
    });
  }

  ngOnInit() {
  }

  inviteToParty(player: RecentPlayer) {
    player.invited = true;
    this.partyService.getAccountForCharacter(player.name).then((account) => {
      if (account !== null) {
        const info: AccountInfo = {
          accountName: account,
          characterName: player.name,
          sessionId: '',
          filePath: ''
        };
        this.externalService.getCharacter(info).subscribe((response: EquipmentResponse) => {
          let newPlayer = {} as Player;
          newPlayer.account = account,
          newPlayer.generic = true;
          newPlayer.genericHost = this.partyService.player.character.name;
          newPlayer = this.externalService.setCharacter(response, newPlayer);
          this.partyService.invitePlayerToGenericParty(newPlayer);
        });
      }
    });
  }
}
