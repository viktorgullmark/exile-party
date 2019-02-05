import { Component, EventEmitter, Input, OnInit, Output, ViewChild, OnDestroy } from '@angular/core';
import { MatSort, MatTableDataSource, MatPaginator } from '@angular/material';
import * as moment from 'moment';

import { ExtendedAreaInfo } from '../../../shared/interfaces/area.interface';
import { Player } from '../../../shared/interfaces/player.interface';
import { PartyService } from '../../../shared/providers/party.service';
import { MapService } from '../../../shared/providers/map.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { Party } from '../../../shared/interfaces/party.interface';

@Component({
  selector: 'app-map-table',
  templateUrl: './map-table.component.html',
  styleUrls: ['./map-table.component.scss']
})
export class MapTableComponent implements OnInit, OnDestroy {

  @Output() filtered: EventEmitter<any> = new EventEmitter;
  displayedColumns: string[] = ['timestamp', 'name', 'tier', 'time'];
  dataSource = [];
  searchText = '';
  filteredArr = [];
  source: any;
  party: Party;
  private selectedFilterValueSub: Subscription;
  private partySub: Subscription;
  public selectedPlayerValue: any;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private partyService: PartyService, private mapService: MapService) {
  }

  ngOnInit() {
    this.partySub = this.partyService.partyUpdated.subscribe(party => {
      if (party !== undefined) {
        this.party = party;

        let foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);

        // temporary check
        if (this.partyService.selectedFilterValue === 'All players') {
          this.selectedPlayerValue = this.getPlayers()[0].character.name;
        } else if (foundPlayer !== undefined) {
          this.selectedPlayerValue = this.partyService.selectedFilterValue;
        } else {
          this.selectedPlayerValue = this.getPlayers()[0].character.name;
        }

        foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);

        this.dataSource = [];
        if (foundPlayer !== undefined) {
          if (foundPlayer.ladderInfo !== null && foundPlayer.ladderInfo !== undefined) {
            if (foundPlayer.account === this.partyService.currentPlayer.account) {
              this.updateTable(this.mapService.localPlayerAreas);
            } else {
              this.updateTable(foundPlayer.pastAreas);
            }
          }
          this.filter();
        }
      }
    });
    this.selectedFilterValueSub = this.partyService.selectedFilterValueSub.subscribe(res => {
      if (res !== undefined) {
        if (this.partyService.selectedFilterValue === 'All players') {
          this.selectedPlayerValue = this.getPlayers()[0].character.name;
        } else {
          this.selectedPlayerValue = this.partyService.selectedFilterValue;
        }
        const foundPlayer = this.party.players.find(x => x.character !== null &&
          x.character.name === this.selectedPlayerValue);
        this.dataSource = [];
        if (foundPlayer !== undefined) {
          if (foundPlayer.ladderInfo !== null && foundPlayer.ladderInfo !== undefined) {
            if (foundPlayer.account === this.partyService.currentPlayer.account) {
              this.updateTable(this.mapService.localPlayerAreas);
            } else {
              this.updateTable(foundPlayer.pastAreas);
            }
          }
          this.filter();
        }
      }
    });
  }

  getPlayers() {
    return this.party.players.filter(x => x.character !== null);
  }

  ngOnDestroy() {
    if (this.selectedFilterValueSub !== undefined) {
      this.selectedFilterValueSub.unsubscribe();
    }
    if (this.partySub !== undefined) {
      this.partySub.unsubscribe();
    }
  }

  doSearch(text: string) {
    this.searchText = text;

    this.filter();
  }

  filter() {
    setTimeout(res => {
      this.filteredArr = [...this.dataSource];
      this.filteredArr = this.filteredArr.filter(item =>
        Object.keys(item).some(k => item[k] != null && item[k] !== '' &&
          item[k].toString().toLowerCase()
            .includes(this.searchText.toLowerCase()))
      );

      this.source = new MatTableDataSource(this.filteredArr);
      this.source.paginator = this.paginator;
      this.source.sort = this.sort;
      this.filtered.emit({ filteredArr: this.filteredArr, dataSource: this.dataSource });
    }, 0);

  }

  formatDate(timestamp) {
    return moment(timestamp).format('llll');
  }

  updateTable(pastAreas: ExtendedAreaInfo[]) {
    if (pastAreas !== null && pastAreas !== undefined) {
      pastAreas.forEach((area: ExtendedAreaInfo) => {
        if (area.duration < 1800) {
          const minute = Math.floor(area.duration / 60);
          const seconds = area.duration % 60;
          const newAreaObj = {
            name: area.eventArea.name,
            tier: area.eventArea.info[0].level,
            time: ((minute < 10) ? '0' + minute.toString() : minute.toString())
              + ':' + ((seconds < 10) ? '0' + seconds.toString() : seconds.toString()),
            timestamp: area.timestamp
          };
          this.dataSource.push(newAreaObj);
        }
      });
    }
  }

}

