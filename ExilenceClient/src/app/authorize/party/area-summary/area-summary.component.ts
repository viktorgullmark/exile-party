import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSelect } from '@angular/material';
import { Subscription } from 'rxjs';

import { Party } from '../../../shared/interfaces/party.interface';
import { PartyService } from '../../../shared/providers/party.service';
import { MapTableComponent } from '../../components/map-table/map-table.component';
import * as moment from 'moment';
import { ExportToCsv } from 'export-to-csv';
import { MapService } from '../../../shared/providers/map.service';
import { SettingsService } from '../../../shared/providers/settings.service';
import { AlertService } from '../../../shared/providers/alert.service';
import { AccountService } from '../../../shared/providers/account.service';

@Component({
  selector: 'app-area-summary',
  templateUrl: './area-summary.component.html',
  styleUrls: ['./area-summary.component.scss']
})
export class AreaSummaryComponent implements OnInit, OnDestroy {
  form: FormGroup;
  averageTimeSpent = '';
  averageGain = '';
  filteredArr = [];
  selfSelected = false;
  private party: Party;
  private selectedFilterValueSub: Subscription;
  private partySub: Subscription;
  dataSource = [];
  tableData = [];

  public selectedLocalValue: string;

  @ViewChild('playerDd') playerDd: MatSelect;
  @ViewChild('table') table: MapTableComponent;

  constructor(
    @Inject(FormBuilder) fb: FormBuilder,
    public partyService: PartyService,
    public mapService: MapService,
    private settingsService: SettingsService,
    private alertService: AlertService,
    private accountService: AccountService
  ) {
    this.form = fb.group({
      searchText: ['']
    });
  }
  ngOnInit() {

    // TODO: remove once ladder has been reworked
    if (this.partyService.selectedFilterValue !== 'All players') {
      this.selectedLocalValue = this.partyService.selectedFilterValue;
    } else {
      this.selectedLocalValue = this.partyService.getPlayers()[0].character.name;
    }

    if (this.partyService.currentPlayer.character !== null &&
      this.selectedLocalValue === this.partyService.currentPlayer.character.name) {
      this.selfSelected = true;
    } else {
      this.selfSelected = false;
    }

    this.selectedFilterValueSub = this.partyService.selectedFilter.subscribe(res => {
      if (res !== undefined) {

        if (this.partyService.currentPlayer.character &&
          res === this.partyService.currentPlayer.character.name) {
          this.selfSelected = true;
        } else {
          this.selfSelected = false;
        }

        // TODO: remove once ladder has been reworked
        if (res !== 'All players') {
          this.selectedLocalValue = res;
        } else {
          this.selectedLocalValue = this.partyService.getPlayers()[0].character.name;
        }

        // update the tables whenever the value changes

        if (this.playerDd !== undefined) {
          this.playerDd.value = this.selectedLocalValue;
        }
        this.updateFilterValue(this.playerDd.value);
      }
    });
    this.partySub = this.partyService.partyUpdated.subscribe(res => {
      if (res !== undefined) {
        this.party = res;

        // check if the current dropdown selection is a player in our party
        const foundPlayer = this.party.players.find(x =>
          x.character !== null && x.character.name === this.selectedLocalValue);

        // if player left or value is incorrect, update dropdown
        if (foundPlayer === undefined) {
          // force-set the value here, since the subscription wont finish in time, should be reworked
          this.selectedLocalValue = this.partyService.getPlayers()[0].character.name;

          if (this.playerDd !== undefined) {
            this.playerDd.value = this.selectedLocalValue;
          }
        }
      }
    });
  }

  resetAreaHistory() {
    if (this.selfSelected) {
      const emptyHistory = this.settingsService.deleteAreas();
      this.mapService.excludeGain = undefined;
      this.partyService.currentPlayer.pastAreas = emptyHistory;
      this.mapService.loadAreasFromSettings();
      this.accountService.player.next(this.partyService.currentPlayer);
      this.partyService.updatePlayer(this.partyService.currentPlayer);
      this.alertService.showAlert({ message: 'Area history was cleared', action: 'OK' });
    }
  }

  ngOnDestroy() {
    if (this.selectedFilterValueSub !== undefined) {
      this.selectedFilterValueSub.unsubscribe();
    }
    if (this.partySub !== undefined) {
      this.partySub.unsubscribe();
    }
  }
  export() {
    const options = {
      fieldSeparator: ';',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Area-export',
      useBom: true,
      useKeysAsHeaders: true,
      filename: 'Areas_' + moment(Date.now()).format('YYYY-MM-DD')
      // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
    };

    const csvExporter = new ExportToCsv(options);
    csvExporter.generateCsv(this.mapToExport(this.tableData));
  }

  mapToExport(array) {
    console.log(array);
    return array.map(x => {
      const tier = x.name.substring(
        x.name.lastIndexOf('(T') + 1,
        x.name.lastIndexOf(')')
      );
      let name;
      if (x.name.indexOf('(') !== -1) {
        name = x.name.substring(
          0,
          x.name.indexOf('(') - 1
        );
      } else { name = x.name; }

      let itemString = '';
      if (x.items !== undefined) {
        itemString = x.items.map(t => t.name).join(', ');
      }

      return {
        DATE: moment(x.timestamp).format('YYYY-MM-DD HH:MM:SS'),
        NAME: name,
        TIER: tier,
        LEVEL: x.tier,
        DURATION: x.time,
        GAIN: x.gain !== undefined ? x.gain.toFixed(2) : '-',
        ITEMS: itemString
      };
    });
  }

  updateSummary(event) {
    this.tableData = event.filteredArr;
    const foundPlayer = this.partyService.party.players.find(x => x.character !== null &&
      x.character.name === this.selectedLocalValue);

    const filteredArr = event.filteredArr;
    this.dataSource = event.dataSource;
    this.filteredArr = [];
    if (foundPlayer !== undefined && foundPlayer.pastAreas !== null) {
      this.filteredArr = foundPlayer.pastAreas.filter(res => {
        return filteredArr.some(x => x.timestamp === res.timestamp);
      });
    }
    this.updateAvgTimeSpent(this.filteredArr);
    this.updateAvgGain(this.tableData);
  }

  updateAvgGain(pastAreas) {
    if (pastAreas !== null) {
      if (pastAreas[0] !== undefined) {
        let total = 0;
        pastAreas.forEach(area => {
          total = total + area.gain;
        });

        if (total !== 0 && pastAreas.length > 0) {
          const average = total / pastAreas.length;
          this.averageGain = average.toFixed(2).toString();
        } else {
          this.averageGain = '';
        }
      } else {
        this.averageGain = '';
      }
    } else {
      this.averageGain = '';
    }
  }

  updateAvgTimeSpent(pastAreas) {
    if (pastAreas !== null) {
      if (pastAreas[0] !== undefined) {
        pastAreas = pastAreas.filter(x => x.duration > 0);
        let total = 0;
        pastAreas.forEach(area => {
          total = total + area.duration;
        });

        const average = total / pastAreas.length;
        if (total !== 0 && pastAreas.length > 0) {
          const minute = Math.floor(average / 60);
          let seconds = average % 60;
          seconds = Math.floor(seconds);
          this.averageTimeSpent = ((minute < 10) ? '0' + minute.toString() : seconds.toString())
            + ':' + ((seconds < 10) ? '0' + seconds.toString() : seconds.toString());
        } else {
          this.averageTimeSpent = '';
        }
      } else {
        this.averageTimeSpent = '';
      }
    } else {
      this.averageTimeSpent = '';
    }
  }

  search() {
    this.table.doSearch(this.form.controls.searchText.value);
  }

  selectPlayer(filterValue: any) {
    this.partyService.selectedFilter.next(filterValue.value);

    if (this.party !== undefined) {
      const foundPlayer =
        this.partyService.party.players.find(x => x.character !== null && x.character.name === this.partyService.selectedFilterValue);

      // update values for entire party, or a specific player, depending on selection
      if (this.partyService.selectedFilterValue === 'All players' || this.partyService.selectedFilterValue === undefined) {
        this.table.dataSource = [];
        this.table.updateTable(this.partyService.currentPlayer.pastAreas);
      } else if (foundPlayer !== undefined) {
        if (this.partyService.currentPlayer.character !== null &&
          foundPlayer.character.name === this.partyService.currentPlayer.character.name) {
          this.table.dataSource = [];
          this.table.updateTable(foundPlayer.pastAreas);
        } else {
          this.table.dataSource = [];
          this.table.updateTable(foundPlayer.pastAreas);
        }
      }
    }
  }

  updateFilterValue(filterValue) {
    if (this.partyService.party !== undefined) {
      const foundPlayer = this.partyService.party.players.find(x => x.character !== null && x.character.name === filterValue);

      if (this.table !== undefined) {
        this.table.dataSource = [];
      }

      if (foundPlayer !== undefined) {
        if (this.table !== undefined) {
          this.table.dataSource = [];
          this.table.updateTable(foundPlayer.pastAreas);
        }
      }
    }
  }
}
