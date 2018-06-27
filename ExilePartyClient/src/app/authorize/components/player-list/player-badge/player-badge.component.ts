import { Component, OnInit, Input } from '@angular/core';
import { Player } from '../../../../shared/interfaces/player.interface';
import { PartyService } from '../../../../shared/providers/party.service';

@Component({
  selector: 'app-player-badge',
  templateUrl: './player-badge.component.html',
  styleUrls: ['./player-badge.component.scss']
})
export class PlayerBadgeComponent implements OnInit {
  @Input() player: Player;
  @Input() localPlayer = false;
  selectedPlayer: Player;
  selectedGenericPlayer: Player;
  constructor(private partyService: PartyService) { }

  ngOnInit() {
    this.partyService.selectedPlayer.subscribe(res => {
      this.selectedPlayer = res;
    });
    this.partyService.selectedGenericPlayer.subscribe(res => {
      this.selectedGenericPlayer = res;
    });
  }

  selectPlayer() {
    this.partyService.selectedPlayer.next(this.player);
    this.partyService.selectedGenericPlayer.next(this.player);
  }

}
