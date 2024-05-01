import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HomePageComponent } from "./home.page";
import { KeyboardModule } from "../ui/keyboard/keyboard.module";

@NgModule({
    imports: [CommonModule, KeyboardModule],
    declarations: [HomePageComponent],
    exports: [HomePageComponent],
})
export class HomeModule {}
