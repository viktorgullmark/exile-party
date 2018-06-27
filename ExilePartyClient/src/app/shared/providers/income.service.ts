import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/range';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/timeInterval';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { Item } from '../interfaces/item.interface';
import { NinjaLine, NinjaTypes } from '../interfaces/poe-ninja.interface';
import { Stash } from '../interfaces/stash.interface';
import { ExternalService } from './external.service';
import { NinjaService } from './ninja.service';
import { PartyService } from './party.service';
import { SessionService } from './session.service';

@Injectable()
export class IncomeService {

  private ninjaPrices: any[] = [];
  private playerStashTabs: any[] = [];

  public totalNetWorthItems: any[] = [];
  public totalNetWorth = 0;

  constructor(
    private ninjaService: NinjaService,
    private partyService: PartyService,
    private externalService: ExternalService,
    private sessionService: SessionService
  ) {


  }

  SnapshotPlayerNetWorth() {

    const sessionId = this.sessionService.getSession();
    const accountName = this.partyService.accountInfo.accountName;
    const league = this.partyService.player.character.league;

    return Observable.forkJoin(
      this.getPlayerStashTabs(sessionId, accountName, league),
      this.getValuesFromNinja(league)
    ).do(() => {
      console.log('[INFO]: Finished retriving stashtabs and value information.');
      this.playerStashTabs.forEach((tab: Stash, tabIndex: number) => {
        tab.items.forEach((item: Item) => {
          let itemName = item.name + ' ' + item.typeLine;
          if (itemName.indexOf('<<') !== -1) {
            itemName = itemName.substring(28);
          } else {
            itemName = itemName.trim();
          }
          if (typeof this.ninjaPrices[itemName] !== 'undefined') {

            let valueForItem = this.ninjaPrices[itemName];
            if (item.stackSize) {
              valueForItem = 0;
              for (let i = 0; i < item.stackSize; i++) {
                valueForItem += this.ninjaPrices[itemName];
              }
            }

            this.totalNetWorthItems.push({
              name: itemName,
              value: valueForItem,
              icon: item.icon,
              tab: tab.tabs[tabIndex].n
            });

          }
        });
      });


      for (let i = 0, _len = this.totalNetWorthItems; i < this.totalNetWorthItems.length; i++) {
        this.totalNetWorth += this.totalNetWorthItems[i].value;
      }

      this.totalNetWorthItems.sort((a: any, b: any) => {
        if (a.value < b.value) {
          return 1;
        }
        if (a.value > b.value) {
          return -1;
        }
        return 0;
      });

      console.log('[INFO] Total player valuables worth: ', this.totalNetWorth);
      console.log('[INFO] Player valuables ', this.totalNetWorthItems);

    });

  }


  getPriceForItem(name: string) {
    return this.ninjaPrices[name];
  }

  getValuesFromNinja(league: string) {
    const enumTypes = Object.values(NinjaTypes);
    return Observable
      .from(enumTypes)
      .concatMap(type => this.ninjaService.getFromNinja(league, type)
        .delay(750))
      .do(typeResponse => {
        typeResponse.lines.forEach((line: NinjaLine) => {

          // Filter each line here, probably needs improvement
          // But the response differse for Currency & Fragments hence the if's

          let links = 0;
          let value = 0;
          let name = '';

          if ('chaosEquivalent' in line) {
            value = line.chaosEquivalent;
          }
          if ('chaosValue' in line) {
            value = line.chaosValue;
          }
          if ('currencyTypeName' in line) {
            name = line.currencyTypeName;
          }
          if ('name' in line) {
            name = line.name + ' ' + line.baseType;
          }
          if ('links' in line) {
            links = line.links;
          }
          if (links === 0 && name !== '') {
            this.ninjaPrices[name] = value;
          }
        });
      });
  }

  getPlayerStashTabs(sessionId: string, accountName: string, league: string) {
    return this.externalService.getStashTabs(sessionId, accountName, league)
      .concatMap((response) => {
        return Observable.from(response.tabs)
          .concatMap(tab => this.externalService.getStashTab(sessionId, accountName, league, tab.i)
            .delay(750))
          .do(stashTab => {
            this.playerStashTabs.push(stashTab);
          });
      });
  }

}
