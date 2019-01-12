import { Component, Input, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatSort, MatTableDataSource } from '@angular/material';

import { Player } from '../../../shared/interfaces/player.interface';
import { PartyService } from '../../../shared/providers/party.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { ItemModule } from '../char-profile/item/item.module';
import { NetWorthSnapshot } from '../../../shared/interfaces/income.interface';
import { SettingsService } from '../../../shared/providers/settings.service';

@Component({
  selector: 'app-networth-table',
  templateUrl: './networth-table.component.html',
  styleUrls: ['./networth-table.component.scss']
})
export class NetworthTableComponent implements OnInit, OnDestroy {
  @Input() player: Player;
  @Input() multiple = false;
  @Input() showOverTime = false;
  displayedColumns: string[] = ['position', 'name', 'links', 'quality', 'stacksize', 'valuePerUnit', 'value'];
  dataSource = [];
  searchText = '';
  filteredArr = [];
  source: any;
  @ViewChild(MatSort) sort: MatSort;
  private selectedPlayerSub: Subscription;
  private partySub: Subscription;

  constructor(private partyService: PartyService, private settingsService: SettingsService) { }

  ngOnInit() {
    if (this.multiple && !this.showOverTime) {
      this.displayedColumns.push('holdingPlayers');
    }
    if (this.player !== undefined) {
      this.loadPlayerData(this.player);
      this.selectedPlayerSub = this.partyService.selectedPlayer.subscribe(res => {
        this.player = res;
        this.dataSource = [];
        if (res.netWorthSnapshots !== null) {
          this.loadPlayerData(res);
        }
        this.filter();
      });
    } else {
      // party logic
      this.partyService.party.players.forEach(p => {
        this.loadPlayerData(p);
      });
      this.filter();

      this.partySub = this.partyService.partyUpdated.subscribe(party => {
        if (party !== undefined) {
          this.dataSource = [];
          party.players.forEach(p => {
            if (p.netWorthSnapshots !== null) {
              this.loadPlayerData(p);
            }
          });
          this.filter();
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.selectedPlayerSub !== undefined) {
      this.selectedPlayerSub.unsubscribe();
    }
    if (this.partySub !== undefined) {
      this.partySub.unsubscribe();
    }
  }

  doSearch(text: string) {
    this.searchText = text;

    this.filter();
  }

  updateGainHours(hours: number) {
    this.dataSource = [];
    this.partyService.party.players.forEach(p => {
      if (p.netWorthSnapshots !== null) {
        this.loadPlayerData(p);
      }
    });
    this.filter();
  }

  filter() {
    this.filteredArr = [...this.dataSource];
    this.filteredArr = this.filteredArr.filter(item =>
      Object.keys(item).some(k => item[k] != null && item[k] !== '' &&
        item[k].toString().toLowerCase()
          .includes(this.searchText.toLowerCase()))
    );

    this.source = new MatTableDataSource(this.filteredArr);
    this.source.sort = this.sort;
  }

  loadPlayerData(player: Player) {
    if (this.showOverTime) {

      const gainHours = this.settingsService.get('gainHours');
      const xHoursAgo = (Date.now() - (gainHours * 60 * 60 * 1000));
      const pastHoursSnapshots = player.netWorthSnapshots
        .filter((snaphot: NetWorthSnapshot) => snaphot.timestamp > xHoursAgo);

      if (pastHoursSnapshots.length > 1) {
        const firstSnapshot = pastHoursSnapshots[pastHoursSnapshots.length - 1];
        const lastSnapshot = pastHoursSnapshots[0];
        const difference = [];
        lastSnapshot.items.forEach(item => {
          // if item exists in first snapshot
          const existingItem = firstSnapshot.items.find(x =>
            x.name === item.name
            && x.quality === item.quality
            && x.links === item.links
            && x.gemLevel === item.gemLevel
            && x.variation === item.variation
          );
          if (existingItem !== undefined) {
            const recentItem = Object.assign({}, item);

            recentItem.stacksize = recentItem.stacksize - existingItem.stacksize;

            existingItem.value = recentItem.valuePerUnit * existingItem.stacksize;

            recentItem.value = recentItem.value - existingItem.value;

            if (recentItem.value !== 0 && recentItem.stacksize !== 0) {
              difference.push(recentItem);
            }
          }
        });
        this.updateOverTime(difference, player.character.name);
      }
    } else {
      this.updateTable(player.netWorthSnapshots[0].items, player.character.name);
    }
  }

  loadPreviousSnapshot(snapshot: any) {
    this.dataSource = [];
    this.updateTable(snapshot.items, this.player.character.name);

    this.filter();
  }

  updateOverTime(items: any[], playerName: string) {
    items.forEach(snapshot => {
      const existingItem = this.dataSource.find(x =>
        x.name === snapshot.name
        && x.quality === snapshot.quality
        && x.links === snapshot.links
        && x.gemLevel === snapshot.gemLevel
        && x.variation === snapshot.variation
      );
      if (existingItem !== undefined) {
        const indexOfItem = this.dataSource.indexOf(existingItem);
        // update existing item with new data
        existingItem.stacksize = snapshot.stacksize + existingItem.stacksize;
        existingItem.value = snapshot.value + existingItem.value;
        // fix for existing items not containing these props
        existingItem.quality = snapshot.quality;
        existingItem.links = snapshot.links;
        this.dataSource[indexOfItem] = existingItem;
      } else {
        const newObj = {
          position: items.indexOf(snapshot) + 1,
          name: snapshot.name,
          stacksize: snapshot.stacksize,
          value: snapshot.value,
          variation: snapshot.variation,
          valuePerUnit: snapshot.valuePerUnit,
          gemLevel: snapshot.gemLevel,
          icon: snapshot.icon,
          links: snapshot.links,
          quality: snapshot.quality,
          holdingPlayers: [playerName]
        };
        this.dataSource.push(newObj);
      }
    });
  }

  updateTable(items: any[], playerName: string) {
    items.forEach(snapshot => {
      const existingItem = this.dataSource.find(x =>
        x.name === snapshot.name
        && x.quality === snapshot.quality
        && x.links === snapshot.links
        && x.gemLevel === snapshot.gemLevel
        && x.variation === snapshot.variation
      );
      if (existingItem !== undefined) {
        const indexOfItem = this.dataSource.indexOf(existingItem);
        // update existing item with new data
        existingItem.stacksize = existingItem.stacksize + snapshot.stacksize;
        existingItem.value = existingItem.value + snapshot.value;
        existingItem.holdingPlayers.push(playerName);
        // fix for existing items not containing these props
        existingItem.quality = snapshot.quality;
        existingItem.links = snapshot.links;
        this.dataSource[indexOfItem] = existingItem;
      } else {
        const newObj = {
          position: items.indexOf(snapshot) + 1,
          name: snapshot.name,
          stacksize: snapshot.stacksize,
          value: snapshot.value,
          variation: snapshot.variation,
          valuePerUnit: snapshot.valuePerUnit,
          icon: snapshot.icon,
          links: snapshot.links,
          quality: snapshot.quality,
          gemLevel: snapshot.gemLevel,
          holdingPlayers: [playerName]
        };
        this.dataSource.push(newObj);
      }
    });
  }
}



