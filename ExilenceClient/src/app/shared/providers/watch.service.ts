import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';

import { CombinedItemPriceInfo } from '../interfaces/poe-watch/combined-item-price-info.interface';
import { ItemInfo } from '../interfaces/poe-watch/Item-info.interface';
import { ItemPrice } from '../interfaces/poe-watch/item-price.interface';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class WatchService {

  private poeWatchBaseUrl = 'https://api.poe.watch';
  private cooldown = false;

  private itemData: ItemInfo[] = [];
  private itemPrices: ItemPrice[] = [];
  public watchPrices: CombinedItemPriceInfo[] = [];

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) { }

  UpdateItemsAndPrices(league: string): Observable<any> {
    this.logService.log('Starting to fetch items and prices from poe.watch');
    return forkJoin([
      this.fetchPrices(league),
      this.fetchItems()]).map(res => {
        this.itemPrices = res[0];
        this.itemData = res[1];
        this.watchPrices = this.itemData.map(x => Object.assign(x, this.itemPrices.find(y => y.id === x.id)));
        this.logService.log('Finished fetching items and prices from poe.watch');

        for (let index = this.watchPrices.length - 1; index >= 0; index--) {

          const item = this.watchPrices[index];

          if (item.icon.indexOf('relic=1') > -1) {
            this.watchPrices.splice(index, 1);
            continue;
          }

          const name = item.name !== null ? item.name : '';
          const type = item.type !== null ? item.type : '';
          const fullname = `${name} ${type}`.trim();
          item.fullname = fullname;

          item.lvl = item.lvl || 0;
          item.ilvl = item.ilvl || 0;
          item.links = item.links || 0;
          item.quality = item.quality || 0;
          item.frame = item.frame || 0;
          item.variation = item.variation || undefined;
          item.corrupted = item.corrupted || undefined;
          if (item.variation) {
            item.variation = item.variation.charAt(0).toUpperCase() + item.variation.slice(1);
            if (item.variation.indexOf('socket') > -1) {
              item.variation = item.variation.replace('socket', 'Jewel');
            }
          }
        }
      }).catch(e => Observable.of(null));
  }

  //#region External Calls
  private fetchPrices(league: string): Observable<ItemPrice[]> {
    if (!this.cooldown || this.itemPrices.length === 0) {
      this.cooldown = true;
      setTimeout(x => {
        this.cooldown = false;
      }, 1000 * 60 * 10);
      const url = `${this.poeWatchBaseUrl}/compact?league=${league}`;
      return this.http.get<ItemPrice[]>(url);
    } else {
      return Observable.of(this.itemPrices);
    }
  }

  private fetchItems(): Observable<ItemInfo[]> {
    if (this.itemData.length !== 0) {
      return Observable.of(this.itemData);
    }
    const url = `${this.poeWatchBaseUrl}/itemdata`;
    return this.http.get<ItemInfo[]>(url);
  }
  //#endregion


}
