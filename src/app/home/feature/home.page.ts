import {
    Inject,
    OnInit,
    signal,
    Component,
    viewChild,
    ElementRef,
    viewChildren,
    AfterViewInit,
    WritableSignal,
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { DOCUMENT } from "@angular/common";
import {
    style,
    query,
    stagger,
    trigger,
    animate,
    transition,
} from "@angular/animations";
import {
    of,
    map,
    tap,
    delay,
    filter,
    merge,
    Subject,
    fromEvent,
    switchMap,
    Observable,
    shareReplay,
    debounceTime,
    withLatestFrom,
    distinctUntilChanged,
} from "rxjs";
import type { ProclaimedStatus } from "@shared/operators";
import { untilDestroyed, withStatusProclaim } from "@shared/operators";
import { mod } from "@shared/utils";

enum ArrowKeyDirection {
    Up = -1,
    Down = 1,
}

const listAnimation = trigger("listUnfoldAnimation", [
    transition(":enter", [
        query(
            ".js-list-item",
            [
                style({ opacity: 0, transform: "translateY(-150px)" }),
                stagger(30, [
                    animate(
                        "300ms cubic-bezier(0.35, 0, 0.25, 1)",
                        style({ opacity: 1, transform: "none" })
                    ),
                ]),
            ],
            { optional: true }
        ),
    ]),
]);

@Component({
    selector: "home-page",
    templateUrl: "./home.page.html",
    styleUrls: ["./home.page.scss"],
    animations: [listAnimation],
})
export class HomePageComponent implements OnInit, AfterViewInit {
    untilDestroyed = untilDestroyed();
    sharedReplayConfig = { bufferSize: 1, refCount: false };

    hostKeydown$: Subject<KeyboardEvent> = new Subject();
    activeListItemIndex: WritableSignal<number> = signal(0); // (0, listLength]

    inputElement = viewChild.required<ElementRef<HTMLInputElement>>("inputRef");
    clearBtnElement =
        viewChild.required<ElementRef<HTMLButtonElement>>("clearBtnRef");
    listItemElements = viewChildren<ElementRef<HTMLLIElement>>("listItemRef");

    constructor(@Inject(DOCUMENT) private document: Document) {}

    inputElement$ = toObservable(this.inputElement);
    clearBtnElement$ = toObservable(this.clearBtnElement);
    listItemElements$ = toObservable(this.listItemElements);

    inputChange$ = this.inputElement$.pipe(
        switchMap(({ nativeElement }) =>
            merge(
                fromEvent<KeyboardEvent>(nativeElement, "keyup"),
                fromEvent<KeyboardEvent>(nativeElement, "paste")
            )
        ),
        shareReplay(this.sharedReplayConfig)
    );

    clearButtonClick$ = this.clearBtnElement$.pipe(
        switchMap(({ nativeElement }) =>
            fromEvent<MouseEvent>(nativeElement, "click")
        ),
        shareReplay(this.sharedReplayConfig)
    );

    getNextListItemIndexToSelect = (
        direction: ArrowKeyDirection,
        currentSelectedIndex: number
    ): number => {
        const listItems = this.listItemElements();
        const nextPresumedValue = currentSelectedIndex + direction;

        return mod(nextPresumedValue, listItems.length + 1);
    };

    selectListItem = ([index, lastTypedInputValue]: [number, string]): void => {
        const inputElement = this.inputElement().nativeElement;
        const listItems = this.listItemElements();

        if (listItems[index]) {
            listItems[index].nativeElement.focus();
            inputElement.value = listItems[index].nativeElement.innerText;
        } else {
            inputElement.focus(); // to remove focus from LI
            inputElement.value = lastTypedInputValue;
        }
    };

    setInputValue = (newValue: string): void => {
        const inputElement = this.inputElement().nativeElement;
        inputElement.value = newValue;
        // Dispatch  Event programmatically, so  we
        // could handle it using fromEvent listeners
        inputElement.dispatchEvent(new Event("paste"));
    };

    redirectBySelectedItem = (index: number, listItems: string[]): void => {
        const wantedQueryString = listItems[index];

        if (!wantedQueryString) {
            console.debug(`Could not get required query. The index is ${index}; 
            results: ${listItems}`);
            return;
        }

        const start = 96; // "a".charCodeAt(0) - 1
        const len = wantedQueryString.length;
        const out = [...wantedQueryString.toLowerCase()].reduce(
            (out, char, pos) => {
                const val = char.charCodeAt(0) - start;
                const pow = Math.pow(26, len - pos - 1);
                return out + val * pow;
            },
            0
        );

        this.document.location.href =
            "https://stackoverflow.com/questions/" + out;
    };

    getInputValueFromEvent = (event: KeyboardEvent | ClipboardEvent) => {
        // If the event originates from the paste event, we cannot
        // retrieve the pasted text directly from the input element
        // or event itself. Therefore, we use the Clipboard API.
        if (event.type === "paste") {
            const clipboardData = (event as ClipboardEvent).clipboardData;
            const inputValueFromClipboard =
                clipboardData?.getData("text/plain");

            // Duck tape alert: We assume that the paste event could
            // originate programmatically, thus one potential source
            // of the value could be Session Storage.
            return (
                inputValueFromClipboard ??
                this.getUserQueryFromSessionStorage() ??
                ""
            );
        }

        return (event.target as HTMLInputElement).value;
    };

    shouldDisplayNoResults = (
        response: ProclaimedStatus<Array<unknown>> | null,
        inputValue: string | null
    ): boolean => {
        const isResolved = response?.status === "resolved";
        const inputIsEmpty = (inputValue?.length ?? 0) === 0;
        const responseLength = isResolved ? response.value.length : 0;

        return isResolved && !inputIsEmpty && responseLength === 0;
    };

    isListItemFocused = (): boolean => {
        return this.document.activeElement?.tagName === "LI";
    };

    getSearchQueryKeyForSessionStorage = (): string => {
        return `${this.constructor.name}_searchQuery`;
    };

    saveQueryToSessionStorage = (value: string): void => {
        sessionStorage.setItem(
            this.getSearchQueryKeyForSessionStorage(),
            value
        );
    };

    getUserQueryFromSessionStorage = (): string => {
        return (
            sessionStorage.getItem(this.getSearchQueryKeyForSessionStorage()) ??
            ""
        );
    };

    clearInput$: Observable<MouseEvent> = this.clearButtonClick$.pipe(
        tap((_) => this.setInputValue(""))
    );

    documentEnter$: Observable<KeyboardEvent> = this.hostKeydown$.pipe(
        filter((event: KeyboardEvent) => event.key === "Enter")
    );

    documentArrowUp$: Observable<number> = this.hostKeydown$.pipe(
        filter((event: KeyboardEvent) => event.key === "ArrowUp"),
        map((_) => ArrowKeyDirection.Up)
    );

    documentArrowDown$: Observable<number> = this.hostKeydown$.pipe(
        filter((event: KeyboardEvent) => event.key === "ArrowDown"),
        map((_) => ArrowKeyDirection.Down)
    );

    inputBackspace$: Observable<KeyboardEvent> = this.inputChange$.pipe(
        filter(
            (event) =>
                event.type === "keyup" &&
                (event as KeyboardEvent)?.key === "Backspace"
        ),
        shareReplay(this.sharedReplayConfig)
    );

    inputValueTrimmed$: Observable<string> = this.inputChange$.pipe(
        map(this.getInputValueFromEvent),
        map((value) => value.trim()),
        shareReplay(this.sharedReplayConfig)
    );

    searchResponse$: Observable<ProclaimedStatus<Array<string>>> =
        this.inputValueTrimmed$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            tap(this.saveQueryToSessionStorage),
            filter(Boolean),
            switchMap((query) =>
                of(["one", "two", "three"]).pipe(delay(200), withStatusProclaim)
            ),
            shareReplay(this.sharedReplayConfig)
        );

    resetSearchResult$: Observable<Array<string>> = merge(
        this.clearInput$,
        this.inputBackspace$
    ).pipe(map(() => []));

    searchResult$: Observable<Array<string>> = merge(
        this.resetSearchResult$,
        this.searchResponse$.pipe(
            map(
                (
                    statusReport: ProclaimedStatus<Array<string>>
                ): Array<string> =>
                    statusReport.status === "resolved" ? statusReport.value : []
            )
        )
    ).pipe(tap((_) => this.activeListItemIndex.set(_.length)));

    listNavigation$: Observable<unknown> = merge(
        this.documentArrowDown$,
        this.documentArrowUp$
    ).pipe(
        map((direction) =>
            this.getNextListItemIndexToSelect(
                direction,
                this.activeListItemIndex()
            )
        ),
        tap((newIndex) => this.activeListItemIndex.set(newIndex)),
        withLatestFrom(this.inputValueTrimmed$),
        tap(this.selectListItem)
    );

    setInputFocus$: Observable<unknown> = this.hostKeydown$.pipe(
        filter(this.isListItemFocused),
        filter(({ key }) => !["ArrowDown", "ArrowUp", "Enter"].includes(key)),
        tap(() => this.inputElement().nativeElement.focus())
    );

    handleUserChoice$: Observable<unknown> = this.documentEnter$.pipe(
        filter(this.isListItemFocused),
        withLatestFrom(this.searchResult$),
        tap(([_, result]) => {
            this.redirectBySelectedItem(this.activeListItemIndex(), result);
        })
    );

    ngAfterViewInit() {
        queueMicrotask(() =>
            // Update view in Microtask queue, so Angular would't be angry
            // about changing value after it was checked
            this.setInputValue(this.getUserQueryFromSessionStorage())
        );
    }

    ngOnInit() {
        fromEvent<KeyboardEvent>(this.document, "keydown")
            .pipe(this.untilDestroyed())
            .subscribe(this.hostKeydown$);

        [
            this.listNavigation$,
            this.setInputFocus$,
            this.handleUserChoice$,
        ].forEach((o) => o.pipe(this.untilDestroyed()).subscribe());
    }
}
