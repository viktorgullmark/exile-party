import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { NetWorthSnapshot } from '../../../shared/interfaces/income.interface';
import { Player } from '../../../shared/interfaces/player.interface';
import { AnalyticsService } from '../../../shared/providers/analytics.service';
import { PartyService } from '../../../shared/providers/party.service';
import { NetworthTableComponent } from '../../components/networth-table/networth-table.component';

@Component({
  selector: 'app-party-summary',
  templateUrl: './party-summary.component.html',
  styleUrls: ['./party-summary.component.scss']
})
export class PartySummaryComponent implements OnInit {
  form: FormGroup;

  isGraphHidden = false;
  @ViewChild('table') table: NetworthTableComponent;

  private oneHourAgo = (Date.now() - (1 * 60 * 60 * 1000));
  public graphDimensions = [1000, 300];
  public gain = 0;
  public partyNetworth = 0;
  constructor(
    @Inject(FormBuilder) fb: FormBuilder,
    private partyService: PartyService,
    private analyticsService: AnalyticsService
  ) {
    this.analyticsService.sendScreenview('/authorized/party/summary');
    this.form = fb.group({
      searchText: ['']
    });
    this.partyService.partyUpdated.subscribe(res => {
      if (res !== undefined) {
        this.oneHourAgo = (Date.now() - (1 * 60 * 60 * 1000));
        let networth = 0;
        this.gain = 0;
        res.players.forEach(p => {
          this.updateGain(p);
          if (p.netWorthSnapshots[0] !== undefined) {
            networth = networth + p.netWorthSnapshots[0].value;
          }
        });
        this.partyNetworth = networth;
      }
    });
  }
  ngOnInit() {
    let networth = 0;
    this.gain = 0;
    this.partyService.party.players.forEach(p => {
      this.updateGain(p);
      networth = networth + p.netWorthSnapshots[0].value;
    });
    this.partyNetworth = networth;
  }


  toggleGraph(event: boolean) {
    this.isGraphHidden = true;
  }

  hideGraph() {
    this.isGraphHidden = true;
  }

  showGraph() {
    this.isGraphHidden = false;
  }

  search() {
    this.table.doSearch(this.form.controls.searchText.value);
  }
  updateGain(player: Player) {

    const pastHoursSnapshots = player.netWorthSnapshots
      .filter((snaphot: NetWorthSnapshot) => snaphot.timestamp > this.oneHourAgo);

    if (pastHoursSnapshots.length > 1) {
      const lastSnapshot = pastHoursSnapshots[0];
      const firstSnapshot = pastHoursSnapshots[pastHoursSnapshots.length - 1];

      const gainHour = ((1000 * 60 * 60)) / (lastSnapshot.timestamp - firstSnapshot.timestamp) * (lastSnapshot.value - firstSnapshot.value);

      this.gain = this.gain + gainHour;
    }
  }
}
