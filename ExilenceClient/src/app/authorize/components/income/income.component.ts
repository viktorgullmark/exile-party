import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { colorSets as ngxChartsColorsets } from '@swimlane/ngx-charts/release/utils/color-sets';
import * as d3 from 'd3';
import * as moment from 'moment';
import { Subscription } from 'rxjs/internal/Subscription';

import { ChartSeries, ChartSeriesEntry } from '../../../shared/interfaces/chart.interface';
import { Player } from '../../../shared/interfaces/player.interface';
import { AccountService } from '../../../shared/providers/account.service';
import { IncomeService } from '../../../shared/providers/income.service';
import { SettingsService } from '../../../shared/providers/settings.service';
import { PartyService } from '../../../shared/providers/party.service';


@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.scss']
})


export class IncomeComponent implements OnInit, OnDestroy {
  dateData: ChartSeries[] = [];
  @Input() player: Player;
  @Input() view = [1000, 400];
  @Input() title = 'Net worth graph';
  @Output() hidden: EventEmitter<any> = new EventEmitter;
  @Output() loadPrevious: EventEmitter<any> = new EventEmitter;

  public isHidden = false;
  public visible = true;
  private data = [];

  public isSummary = false;
  private selectedPlayerSub: Subscription;
  private partySubscription: Subscription;

  // line interpolation
  curveType = 'Linear';
  curve = d3.curveLinear;

  colorScheme = {
    domain: ['#e91e63', '#f2f2f2', '#FFEE93', '#8789C0', '#45F0DF']
  };

  schemeType = 'ordinal';
  selectedColorScheme: string;

  constructor(
    private partyService: PartyService,
    private settingService: SettingsService,
  ) {
  }

  ngOnInit() {
    if (this.player !== undefined) {
      this.updateGraph(this.player);
      this.selectedPlayerSub = this.partyService.selectedPlayer.subscribe(res => {
        this.dateData = [];
        this.data = [];
        if (res.netWorthSnapshots !== null) {
          this.updateGraph(res);
        }
      });
    } else {
      // party logic
      this.isSummary = true;
      // update the graph every minute, to update labels
      setInterval(() => {
        this.dateData = [];
        this.data = [];
        this.partyService.party.players.forEach(p => {
          if (p.netWorthSnapshots !== null) {
            this.updateGraph(p);
          }
        });
      }, 60 * 1000);
      this.partySubscription = this.partyService.partyUpdated.subscribe(party => {
        if (party !== undefined) {
          this.dateData = [];
          this.data = [];
          party.players.forEach(p => {
            if (p.netWorthSnapshots !== null) {
              this.updateGraph(p);
            }
          });
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.selectedPlayerSub !== undefined) {
      this.selectedPlayerSub.unsubscribe();
    }
    if (this.partySubscription !== undefined) {
      this.partySubscription.unsubscribe();
    }
  }

  hideGraph() {
    this.isHidden = true;
    this.hidden.emit(this.isHidden);
  }

  showGraph() {
    this.isHidden = false;
    this.hidden.emit(this.isHidden);
  }

  updateGraph(player: Player) {
    const playerObj = Object.assign({}, player);


    let netWorthHistoryDays = this.settingService.get('netWorthHistoryDays');
    if (netWorthHistoryDays === undefined) {
      netWorthHistoryDays = 14;
      this.settingService.set('netWorthHistoryDays', netWorthHistoryDays);
    }
    const daysAgo = (Date.now() - (netWorthHistoryDays * 24 * 60 * 60 * 1000));
    playerObj.netWorthSnapshots = playerObj.netWorthSnapshots.filter(x => x.timestamp > daysAgo);
    if (playerObj.netWorthSnapshots.length === 0) {
      playerObj.netWorthSnapshots = [{
        timestamp: 0,
        value: 0,
        items: []
      }];
    }

    const entry: ChartSeries = {
      name: playerObj.character.name + ' (' + moment(playerObj.netWorthSnapshots[0].timestamp).fromNow() + ')',
      series: playerObj.netWorthSnapshots.map(snapshot => {
        const seriesEntry: ChartSeriesEntry = {
          name: new Date(snapshot.timestamp),
          value: snapshot.value,
          items: snapshot.items
        };
        return seriesEntry;
      })
    };
    if (playerObj.netWorthSnapshots[0].timestamp === 0) {
      if (this.player !== undefined) {
        this.dateData.push(entry);
      }
    } else {
      this.dateData.push(entry);
    }
    const data = [... this.dateData];
    this.dateData = data;
  }

  axisFormat(val) {
    return moment(val).format('MM-DD, LT');
  }

  setColorScheme(name) {
    this.selectedColorScheme = name;
    this.colorScheme = ngxChartsColorsets.find(s => s.name === name);
  }

  select(data): void {
    const snapshot = this.dateData[0].series.filter(t => {
      if (t.name === data.name) {
        return true;
      }
      return false;
    })[0];
    this.loadPreviousSnapshot(snapshot);
  }

  loadPreviousSnapshot(snapshot) {
    this.loadPrevious.emit(snapshot);
  }

  onLegendLabelClick(entry) {
  }

}
