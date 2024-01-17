import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    ViewChild,
} from "@angular/core";
import {
    distinctUntilChanged,
    debounceTime,
    ReplaySubject,
    Subject,
    fromEvent,
    takeUntil,
    shareReplay,
    switchMap,
    map,
    merge,
    Observable,
    tap,
    filter,
    delay,
    of,
} from "rxjs";
import { ProclaimedStatus, withStatusProclaim } from "./shared/operators";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent implements AfterViewInit, OnDestroy {
    @ViewChild("inputBox", { static: true })
    inputRef: ElementRef | undefined;

    @ViewChild("clearBtn", { static: true })
    clearBtnRef: ElementRef | undefined;

    inputChanges$: Subject<KeyboardEvent> = new Subject<KeyboardEvent>();
    clearButtonClick$: Subject<MouseEvent> = new Subject<MouseEvent>();
    private destroy$: ReplaySubject<null> = new ReplaySubject<null>();

    clearInput$: Observable<MouseEvent> = this.clearButtonClick$.pipe(
        tap((_) => this.setInputValue(""))
    );

    backspaceKeyup$: Observable<KeyboardEvent> = this.inputChanges$.pipe(
        filter((event: KeyboardEvent) => event.key === "Backspace")
    );

    inputValueTrimmed$: Observable<string> = this.inputChanges$.pipe(
        map((event: KeyboardEvent) =>
            (event.target as HTMLInputElement).value.trim()
        ),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        })
    );

    searchStatus$: Observable<ProclaimedStatus<Array<string>>> =
        this.inputValueTrimmed$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            filter(Boolean),
            switchMap((query: string) =>
                of([]).pipe(delay(1000), withStatusProclaim)
            ),
            shareReplay({
                bufferSize: 1,
                refCount: false,
            })
        );

    suggestions$: Observable<Array<string>> = this.searchStatus$.pipe(
        map(
            (statusReport: ProclaimedStatus<Array<string>>): Array<string> =>
                statusReport.status === "resolved" ? statusReport.value : []
        )
    );

    refreshSuggestions$: Observable<Array<string>> = merge(
        this.clearInput$,
        this.backspaceKeyup$
    ).pipe(map(() => []));

    displayResults$: Observable<Array<string>> = merge(
        this.suggestions$,
        this.refreshSuggestions$
    );

    shouldDisplayNoResults = (
        status: ProclaimedStatus<Array<unknown>> | null,
        inputValue: string | null
    ): boolean => {
        const isResolved = status?.status === "resolved";
        const inputIsEmpty = (inputValue?.length ?? 0) === 0;
        const resultsLength = isResolved ? status.value.length : 0;

        return isResolved && !inputIsEmpty && resultsLength === 0;
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

    ngAfterViewInit(): void {
        if (this.inputRef !== undefined) {
            merge(
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "keyup"),
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "paste")
            )
                .pipe(takeUntil(this.destroy$))
                .subscribe(this.inputChanges$);
        }

        if (this.clearBtnRef !== undefined) {
            fromEvent<MouseEvent>(this.clearBtnRef.nativeElement, "click")
                .pipe(takeUntil(this.destroy$))
                .subscribe(this.clearButtonClick$);
        }
    }

    ngOnDestroy(): void {
        if (this.destroy$) {
            this.destroy$.next(null);
            this.destroy$.complete();
        }
    }
}
