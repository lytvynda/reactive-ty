import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    OnInit,
    QueryList,
    ViewChild,
    ViewChildren,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import {
    style,
    stagger,
    trigger,
    transition,
    animate,
    query,
} from "@angular/animations";
import {
    BehaviorSubject,
    debounceTime,
    delay,
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    merge,
    Observable,
    of,
    pipe,
    ReplaySubject,
    shareReplay,
    Subject,
    switchMap,
    tap,
    withLatestFrom,
} from "rxjs";
import type { ProclaimedStatus } from "./shared/operators";
import { untilDestroyed, withStatusProclaim } from "./shared/operators";

enum ArrowKeyDirection {
    Up = -1,
    Down = 1,
}

/**
 * Calculates the correct modulo operation in JavaScript, handling negative numbers.
 *
 * JavaScript's native modulo operator (%) may not behave as expected for negative numbers.
 * This function ensures correct modulo calculation for both positive and negative numbers.
 *
 * @param {number} n - The dividend.
 * @param {number} m - The divisor.
 * @returns {number} The result of the modulo operation (n % m).
 */
function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

const listAnimation = trigger("listAnimation", [
    transition(":enter", [
        query(
            ".listItem",
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
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
    animations: [listAnimation],
})
export class AppComponent implements AfterViewInit, OnInit {
    // Begin counting from -1 instead of 0 to ensure that
    // we end up at index 0 by first forward navigation.
    readonly startListIndex: number = -1;

    @ViewChild("inputBox", { static: true })
    inputRef: ElementRef | undefined;

    @ViewChild("clearBtn", { static: true })
    clearBtnRef: ElementRef | undefined;

    @ViewChildren("listItem")
    resultListItems: QueryList<ElementRef> | undefined;

    inputChange$: Subject<KeyboardEvent | ClipboardEvent> = new Subject();
    hostKeydown$: Subject<KeyboardEvent> = new Subject();
    clearButtonClick$: Subject<MouseEvent> = new Subject();

    activeListItemIndex$: BehaviorSubject<number> = new BehaviorSubject(
        this.startListIndex
    );
    private untilDestroyed = untilDestroyed();

    constructor(@Inject(DOCUMENT) private document: Document) {}

    nextListIndexToSelect = ([direction, currentSelectedIndex]: [
        number,
        number,
    ]): number => {
        const listItems: ElementRef[] | undefined =
            this.resultListItems?.toArray();
        const listLength: number = listItems ? listItems.length : 0;

        if (direction === ArrowKeyDirection.Up) {
            return currentSelectedIndex <= 0
                ? listLength + direction
                : currentSelectedIndex + direction;
        }

        return mod(currentSelectedIndex + direction, listLength);
    };

    setFocusOnListItem = (index: number): void => {
        const listItems: ElementRef[] | undefined =
            this.resultListItems?.toArray();

        if (listItems?.[index]) {
            listItems[index].nativeElement.focus();
        }
    };

    setInputValue = (newValue: string): void => {
        if (this.inputRef === undefined) {
            console.debug("Input ref is undefined, couldn't set new value");
            return;
        }

        const inputElement = this.inputRef.nativeElement;
        inputElement.value = newValue;
        // Dispatch Event programmatically, so we could handle it using fromEvent listeners
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
            return clipboardData?.getData("text/plain")?.trim() ?? "";
        }

        return (event.target as HTMLInputElement).value.trim();
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

    isUserFocusedOnListItem = (): boolean => {
        return this.document.activeElement?.tagName === "LI";
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
        filter<any>(
            (event) =>
                event.type === "keyup" &&
                (event as KeyboardEvent)?.key === "Backspace"
        )
    );

    inputValueTrimmed$: Observable<string> = this.inputChange$.pipe(
        map(this.getInputValueFromEvent),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        })
    );

    searchResponse$: Observable<ProclaimedStatus<Array<string>>> =
        this.inputValueTrimmed$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(Boolean),
            switchMap((query: string) =>
                of(["one", "two", "three"]).pipe(delay(200), withStatusProclaim)
            ),
            shareReplay({
                bufferSize: 1,
                refCount: false,
            })
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
    ).pipe(tap((_) => this.activeListItemIndex$.next(this.startListIndex)));

    listNavigation$: Observable<unknown> = merge(
        this.documentArrowDown$,
        this.documentArrowUp$
    ).pipe(
        withLatestFrom(this.activeListItemIndex$),
        map(this.nextListIndexToSelect),
        tap(this.setFocusOnListItem),
        tap((newIndex) => this.activeListItemIndex$.next(newIndex))
    );

    setInputFocus$: Observable<unknown> = this.hostKeydown$.pipe(
        filter(this.isUserFocusedOnListItem),
        filter(
            (event) => !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)
        ),
        tap(() => this.inputRef?.nativeElement?.focus())
    );

    handleUserChoice$: Observable<unknown> = this.documentEnter$.pipe(
        filter(this.isUserFocusedOnListItem),
        withLatestFrom(this.activeListItemIndex$, this.searchResult$),
        tap(([_, index, result]) => {
            this.redirectBySelectedItem(index, result);
        })
    );

    ngAfterViewInit(): void {
        if (this.inputRef !== undefined) {
            merge(
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "keyup"),
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "paste")
            )
                .pipe(this.untilDestroyed())
                .subscribe(this.inputChange$);
        }

        if (this.clearBtnRef !== undefined) {
            fromEvent<MouseEvent>(this.clearBtnRef.nativeElement, "click")
                .pipe(this.untilDestroyed())
                .subscribe(this.clearButtonClick$);
        }

        fromEvent<KeyboardEvent>(this.document, "keydown")
            .pipe(this.untilDestroyed())
            .subscribe(this.hostKeydown$);
    }

    ngOnInit() {
        [
            this.listNavigation$,
            this.setInputFocus$,
            this.handleUserChoice$,
        ].forEach((o) => o.pipe(this.untilDestroyed()).subscribe());
    }
}
