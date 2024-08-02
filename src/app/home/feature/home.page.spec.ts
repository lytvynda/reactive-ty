import { TestBed } from "@angular/core/testing";
import { HomePageComponent } from "./home.page";

describe(HomePageComponent.name, () => {
    beforeEach(() =>
        TestBed.configureTestingModule({
            declarations: [HomePageComponent],
        })
    );

    it("should create the app", () => {
        const fixture = TestBed.createComponent(HomePageComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it(`should have as title 'typeahead-rxjs'`, () => {
        const fixture = TestBed.createComponent(HomePageComponent);
        const app = fixture.componentInstance;
        // expect(app.title).toEqual('typeahead-rxjs');
    });

    it("should render title", () => {
        const fixture = TestBed.createComponent(HomePageComponent);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector(".content span")?.textContent).toContain(
            "typeahead-rxjs app is running!"
        );
    });
});

/*
getNextListItemIndexToSelect - статична перевірка по індексу
inputChange - emmits value on input events
shouldDisplayNoResults - статична перевірка
resetSearchResult - статична перевірка

*/