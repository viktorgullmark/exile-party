import { EventEmitter, Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

import { AreaHelper } from '../helpers/area.helper';
import { HistoryHelper } from '../helpers/history.helper';
import { ItemHelper } from '../helpers/item.helper';
import { AreaEventType, AreaInfo, EventArea, ExtendedAreaInfo } from '../interfaces/area.interface';
import { NetWorthItem } from '../interfaces/income.interface';
import { Item } from '../interfaces/item.interface';
import { Player } from '../interfaces/player.interface';
import { AccountService } from './account.service';
import { IncomeService } from './income.service';
import { LogMonitorService } from './log-monitor.service';
import { PartyService } from './party.service';
import { PricingService } from './pricing.service';
import { SettingsService } from './settings.service';

@Injectable()
export class MapService implements OnDestroy {

  private areaHistory: ExtendedAreaInfo[] = [];
  public area: ExtendedAreaInfo;
  public previousInstanceServer: string;
  public previousDate: Date;
  private localPlayer: Player;
  public excludeGain: NetWorthItem[] = undefined;

  private playerSub: Subscription;
  private enteredNeutralAreaSub: Subscription;
  private enteredHostileAreaSub: Subscription;
  private enteredSameInstance = false;
  private enteredSubArea = false;

  private neutralGain = false;

  areasParsed: EventEmitter<any> = new EventEmitter();

  constructor(
    private logMonitorService: LogMonitorService,
    private accountService: AccountService,
    private partyService: PartyService,
    private incomeService: IncomeService,
    private settingsService: SettingsService,
    private pricingService: PricingService
  ) {
    this.loadAreasFromSettings();
    const neutralGainSetting = this.settingsService.get('neutralGain');
    if (neutralGainSetting !== undefined) {
      this.neutralGain = neutralGainSetting;
    } else {
      this.settingsService.set('neutralGain', false);
    }
    this.enteredNeutralAreaSub = this.partyService.enteredNeutralArea.subscribe((inventory: Item[]) => {
      if (inventory !== undefined) {
        this.EnteredArea(inventory);
      }
    });

    this.enteredHostileAreaSub = this.partyService.enteredHostileArea.subscribe((inventory: Item[]) => {
      if (inventory !== undefined) {
        this.EnteredArea(inventory);
      }
    });



    this.playerSub = this.accountService.player.subscribe(player => {
      if (player !== undefined) {
        this.localPlayer = player;
      }
    });

    this.logMonitorService.instanceServerEvent.subscribe(e => {
      this.previousInstanceServer = e.address;
    });

    this.logMonitorService.areaEvent.subscribe((e: EventArea) => {
      this.registerAreaEvent(e);
    });
  }


  EnteredArea(inventory: Item[], ) {
    this.neutralGain = this.settingsService.get('neutralGain');

    const currentInventory = this.priceAndCombineInventory(inventory);
    if (!this.enteredSubArea) {
      this.areaHistory[0].inventory = currentInventory;
      if (
        this.areaHistory[1] !== undefined &&
        !this.enteredSameInstance &&
        (this.neutralGain || (!this.neutralGain && !AreaHelper.isNeutralZone(this.areaHistory[1])))
      ) {
        const gainedItems: NetWorthItem[] = ItemHelper.GetNetworthItemDifference(currentInventory, this.areaHistory[1].inventory);
        if (this.areaHistory[1].difference.length > 0) {
          this.areaHistory[1].difference = ItemHelper.CombineNetworthItemStacks(this.areaHistory[1].difference.concat(gainedItems));
        } else {
          this.areaHistory[1].difference = [...gainedItems];
        }
      }
    } else {
      if (this.areaHistory[0].subAreas.length > 0) {
        const gainedItems: NetWorthItem[] = ItemHelper.GetNetworthItemDifference(currentInventory, this.areaHistory[0].inventory)
        this.areaHistory[0].difference = ItemHelper.CombineNetworthItemStacks(gainedItems);
      }
    }

  }

  priceAndCombineInventory(items: Item[]): NetWorthItem[] {
    const networthItems: NetWorthItem[] = [];
    const convertedItems: Item[] = [];
    items.forEach((item: Item) => {
      if (ItemHelper.isSixSocket(item)) {
        convertedItems.push(ItemHelper.generateJewellersOrb());
      }
      const pricedItem = ItemHelper.toNetworthItem(item, this.pricingService.priceItem(item));
      networthItems.push(pricedItem);
    });

    convertedItems.forEach((item: Item) => {
      const pricedItem = ItemHelper.toNetworthItem(item, this.pricingService.priceItem(item));
      networthItems.push(pricedItem);
    });

    return ItemHelper.CombineNetworthItemStacks(networthItems);
  }

  ngOnDestroy() {
    if (this.playerSub !== undefined) {
      this.playerSub.unsubscribe();
    }
    if (this.enteredHostileAreaSub !== undefined) {
      this.enteredHostileAreaSub.unsubscribe();
    }
    if (this.enteredNeutralAreaSub !== undefined) {
      this.enteredNeutralAreaSub.unsubscribe();
    }
  }

  registerAreaEvent(e: EventArea) {
    this.enteredSameInstance = false;
    this.enteredSubArea = false;
    e.name = AreaHelper.formatName(e);

    const character = this.settingsService.getCurrentCharacter();
    if (character !== undefined) {
      this.areaHistory = character.areas;
    }

    const areaEntered = {
      eventArea: this.formatAreaInfo(e),
      type: AreaEventType.Join,
      timestamp: new Date(e.timestamp).getTime(),
      duration: 0,
      instanceServer: this.previousInstanceServer,
      difference: [],
      inventory: [],
      subAreas: []
    } as ExtendedAreaInfo;

    this.addAreaHistory(areaEntered);

    const previousZoneNeutral = this.areaHistory[1] !== undefined && AreaHelper.isNeutralZone(this.areaHistory[1]);

    if (this.areaHistory.length > 2) {
      const diffSeconds = (this.areaHistory[0].timestamp - this.areaHistory[1].timestamp) / 1000;
      this.areaHistory[1].duration = diffSeconds;
      if (this.areaHistory[1].subAreas.length > 0) {
        if (this.areaHistory[1].subAreas.length === 1) {
          this.areaHistory[1].subAreas[0].duration =
            (this.areaHistory[0].timestamp - this.areaHistory[1].subAreas[0].timestamp) / 1000;
        } else {
          const subAreaDiffSeconds = (this.areaHistory[0].timestamp - this.areaHistory[1].subAreas[0].timestamp) / 1000;
          this.areaHistory[1].subAreas[0].duration = subAreaDiffSeconds;
        }
      }

      const sameInstance = AreaHelper.isSameInstance(this.areaHistory[0], this.areaHistory[2]);

      if (sameInstance && !AreaHelper.isNeutralZone(this.areaHistory[0])) {
        if (previousZoneNeutral) {
          this.areaHistory.shift(); // remove neutral zone
          this.areaHistory.shift(); // remove duplicate zone
          this.areaHistory[0].duration = 0;
          this.enteredSameInstance = true;
        } else {
          if (this.areaHistory[1].eventArea.type === 'map' ||
            this.areaHistory[1].eventArea.type === 'vaal' ||
            this.areaHistory[1].eventArea.type === 'labyrinth' ||
            this.areaHistory[1].eventArea.type === 'unknown') {
            this.areaHistory.shift(); // remove duplicate zone
            const subArea = this.areaHistory.shift();
            this.areaHistory[0].subAreas.unshift(subArea);
            this.enteredSubArea = true;
          }
        }
        this.enteredSameInstance = true;
      }
    }

    if (this.areaHistory[1] !== undefined && this.areaHistory[1].eventArea.type === 'vaal') {
      this.areaHistory.shift(); // remove duplicate zone
      const subArea = this.areaHistory.shift(); // remove sub area
      this.areaHistory[0].subAreas.unshift(subArea);
      this.enteredSubArea = true;
    }

    if (this.areaHistory[1] !== undefined &&
      this.areaHistory[1].eventArea.name === 'Aspirants\' Plaza' &&
      this.areaHistory[0].eventArea.type === 'unknown') {
      const subArea = this.areaHistory.shift();
      this.areaHistory[0].subAreas.unshift(subArea);
      this.enteredSubArea = true;
    }

    character.areas = this.areaHistory;
    this.settingsService.updateCharacter(character);

    this.incomeService.Snapshot();

    this.localPlayer.area = this.areaHistory[0].eventArea.name;
    this.localPlayer.areaInfo = this.areaHistory[0];
    this.localPlayer.pastAreas = HistoryHelper.filterAreas(this.areaHistory, (Date.now() - (24 * 60 * 60 * 1000)));
    this.accountService.player.next(Object.assign({}, this.localPlayer));

    if (AreaHelper.isNeutralZone(areaEntered)) {
      this.partyService.updatePlayer(Object.assign({}, this.localPlayer), 'area-change-to-neutral');
    }
    if (!AreaHelper.isNeutralZone(areaEntered)) {
      this.partyService.updatePlayer(Object.assign({}, this.localPlayer), 'area-change-to-hostile');
    }
  }

  addAreaHistory(eventArea) {
    this.areaHistory.unshift(eventArea);
    if (this.areaHistory.length > 1000) {
      this.areaHistory.pop();
    }
  }

  loadAreasFromSettings() {
    const character = this.settingsService.getCurrentCharacter();
    if (character !== undefined) {
      this.areaHistory = character.areas;
    }
  }

  removeAreasFromSettings() {
    const character = this.settingsService.getCurrentCharacter();
    if (character !== undefined) {
      character.areas = [];
      this.settingsService.updateCharacter(character);
      this.areaHistory = character.areas;
    }
  }

  formatAreaInfo(e: EventArea) {
    if (e.info.length === undefined) {
      e.info = [];
    }

    if (e.info.length < 1) {
      e.info.push({
        act: 0,
        bosses: [],
        town: false,
        waypoint: false
      } as AreaInfo);
    }
    return e;
  }
}
