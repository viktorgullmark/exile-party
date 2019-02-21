import { Component, EventEmitter, NgZone, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs/internal/Subscription';

import { LadderState } from '../../../app.states';
import { Party } from '../../../shared/interfaces/party.interface';
import { LadderPlayer, PlayerLadder } from '../../../shared/interfaces/player.interface';
import { PartyService } from '../../../shared/providers/party.service';
import * as fromReducer from '../../../store/reducers/ladder.reducer';

@Component({
  selector: 'app-ladder-table',
  templateUrl: './ladder-table.component.html',
  styleUrls: ['./ladder-table.component.scss']
})
export class LadderTableComponent implements OnInit, OnDestroy {
  // tslint:disable-next-line:max-line-length
  displayedColumns: string[] = ['online', 'rank', 'level', 'challenges', 'account', 'character', 'class', 'classRank', 'depthGroup', 'depthSolo'];
  dataSource = [];
  filteredArr = [];
  searchText = '';
  source: any;
  party: Party;
  private selectedFilterValueSub: Subscription;
  private partySub: Subscription;
  private ladderStoreSub: Subscription;
  private playerLadders: Array<PlayerLadder> = [];
  private allLadders$: Observable<PlayerLadder[]>;

  public selectedPlayerValue: any;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @Output() filtered: EventEmitter<any> = new EventEmitter;
  constructor(private partyService: PartyService, private ladderStore: Store<LadderState>, private ngZone: NgZone) {
  }

  ngOnInit() {
    this.allLadders$ = this.ladderStore.select(fromReducer.selectAllLadders);

    this.ladderStoreSub = this.allLadders$.subscribe(ladders => {
      this.playerLadders = ladders;
      this.dataSource = [];
      // if the selection is the right one, update table directly when state is updated
      if (this.party !== undefined) {
        const foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);
        if (foundPlayer !== undefined) {
          const ladder = this.playerLadders.find(x => x.name === foundPlayer.character.league);
          if (ladder !== undefined) {
            this.updateTable(ladder.players);
          }
          this.filter();
        }
      }
    });

    this.partySub = this.partyService.partyUpdated.subscribe(party => {
      if (party !== undefined) {
        this.party = party;

        let foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);

        // temporary check
        if (this.partyService.selectedFilterValue === 'All players') {
          this.selectedPlayerValue = this.partyService.getPlayers()[0].character.name;
        } else if (foundPlayer !== undefined) {
          this.selectedPlayerValue = this.partyService.selectedFilterValue;
        } else {
          this.selectedPlayerValue = this.partyService.getPlayers()[0].character.name;
        }

        setTimeout(() => {
          this.partyService.selectedFilter.next(this.selectedPlayerValue);
        }, 0);

        foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);

        this.dataSource = [];
        if (foundPlayer !== undefined) {
          const ladder = this.playerLadders.find(x => x.name === foundPlayer.character.league);
          if (ladder !== undefined) {
            this.updateTable(ladder.players);
          }
          this.filter();
        }
      }
    });
    this.selectedFilterValueSub = this.partyService.selectedFilter.subscribe(res => {
      if (res !== undefined) {
        if (res === 'All players') {
          this.selectedPlayerValue = this.partyService.getPlayers()[0].character.name;
        } else {
          this.selectedPlayerValue = res;
        }
        const foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);
        this.dataSource = [];
        if (foundPlayer !== undefined) {
          const ladder = this.playerLadders.find(x => x.name === foundPlayer.character.league);
          if (ladder !== undefined) {
            this.updateTable(ladder.players);
          }
          this.filter();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.selectedFilterValueSub !== undefined) {
      this.selectedFilterValueSub.unsubscribe();
    }
    if (this.partySub !== undefined) {
      this.partySub.unsubscribe();
    }
    if (this.ladderStoreSub !== undefined) {
      this.ladderStoreSub.unsubscribe();
    }
  }

  doSearch(text: string) {
    this.searchText = text;

    this.filter();
  }

  findSelectedPlayerOnLadder(source) {
    if (this.paginator !== undefined) {

      const data = source.sortData(source.filteredData, source.sort);
      const count = data.length;
      const pageSize = this.paginator.pageSize;

      // find player on ladder based on dropdown-value
      const foundOnLadder = data.find(x => x.character === this.selectedPlayerValue);

      if (foundOnLadder !== undefined) {
        const indexOfPlayer = data.indexOf(foundOnLadder);

        // make sure player exists in the current filtered array
        if (count >= indexOfPlayer) {
          // round page downwards
          const pageToGoTo = Math.floor(indexOfPlayer / pageSize);
          // make sure we're not already on the requested page before navigating

          this.paginator.pageIndex = pageToGoTo;
        }

      }
    }
  }

  filter() {
    setTimeout(res => {

      this.filteredArr = [...this.dataSource];
      this.filteredArr = this.filteredArr.filter(item =>
        Object.keys(item).some(k => item[k] != null && item[k] !== '' &&
          item[k].toString().toLowerCase()
            .includes(this.searchText.toLowerCase()))
      );

      this.ngZone.run(() => {
        this.source = new MatTableDataSource(this.filteredArr);
        this.source.sortingDataAccessor = (item, property) => {
          switch (property) {
            case 'level': return item.experience;
            case 'class': return item.rank.class;
            default: return item[property];
          }
        };
        this.source.sort = this.sort;

        // todo : move method to appropriate place, this is just for testing
        this.findSelectedPlayerOnLadder(this.source);

        this.source.paginator = this.paginator;
      });
      this.filtered.emit({ filteredArr: this.filteredArr, dataSource: this.dataSource });
    }, 0);

  }

  updateTable(playersOnLadder: LadderPlayer[]) {
    if (playersOnLadder !== null) {
      playersOnLadder.forEach((player: LadderPlayer) => {
        const newPlayerObj = {
          character: player.name,
          level: player.level,
          online: player.online,
          account: player.account,
          challenges: player.challenges,
          dead: player.dead,
          experience: player.experience,
          rank: player.rank.overall,
          twitch: player.twitch,
          depthSolo: player.depth.solo,
          depthGroup: player.depth.group,
          depthSoloRank: player.depth.soloRank,
          depthGroupRank: player.depth.groupRank,
          class: player.class,
          classRank: player.rank.class,
          experiencePerHour: this.numberWithSpaces(player.experiencePerHour)
        };

        this.dataSource.push(newPlayerObj);
      });
    }
  }

  numberWithSpaces(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
}

