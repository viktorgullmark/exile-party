import { Component, OnInit } from '@angular/core';

import { LogMessage, LogMessageChat } from '../../../shared/interfaces/log-message.interface';
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



  recentPlayers: RecentPlayer[] = [];

  constructor(
    private partyService: PartyService,
    private logMonitorService: LogMonitorService
  ) {

    const demoPlayer: RecentPlayer = {
      name: 'CojL_',
      invited: false
    };

    this.recentPlayers.unshift(demoPlayer);

    this.logMonitorService.messageEvent.subscribe((msg: LogMessage) => {
      console.log(msg);
      if (msg.chat === LogMessageChat.PARTY_CHAT || msg.chat === LogMessageChat.LOCAL_CHAT) {
        if (!this.playerExists(msg.player.name)) {

          const newPlayer: RecentPlayer = {
            name: msg.player.name,
            invited: false
          };

          this.recentPlayers.unshift(newPlayer);
          if (this.recentPlayers.length > 6) {
            this.recentPlayers.splice(-1, 1);
          }
        }
      }
    });
  }

  playerExists(name) {
    let found = false;
    for (let i = 0; i < this.recentPlayers.length; i++) {
      if (this.recentPlayers[i].name === name) {
        found = true;
        break;
      }
    }
  }

  ngOnInit() {
  }

  inviteToParty(player: RecentPlayer) {
    player.invited = true;
    this.partyService.invitePlayerToLocalParty(player.name);
  }

}
