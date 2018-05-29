import { NgModule } from '@angular/core';
import { CharProfileComponent } from './char-profile.component';
import { CharInventoryModule } from './char-inventory/char-inventory.module';
import { CharEquipmentModule } from './char-equipment/char-equipment.module';
import { SharedModule } from '../../../shared/shared.module';
import { CharSummaryModule } from './char-summary/char-summary.module';

@NgModule({
  imports: [
    SharedModule,
    CharInventoryModule,
    CharEquipmentModule,
    CharSummaryModule
  ],
  declarations: [CharProfileComponent],
  exports: [CharProfileComponent]
})
export class CharProfileModule { }
