import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HomePage } from "./home.page";
import { KeyboardModule } from "../ui/keyboard/keyboard.module";

@NgModule({
    imports: [CommonModule, KeyboardModule],
    declarations: [HomePage],
    exports: [HomePage],
})
export class HomeModule {}
