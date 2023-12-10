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
    map,
    scan,
    merge,
    Observable,
    tap,
    filter,
    delay,
} from "rxjs";

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
    clearBtnClicks$: Subject<MouseEvent> = new Subject<MouseEvent>();
    private destroySignals$: ReplaySubject<null> = new ReplaySubject<null>();

    clearInputSignals$ = this.clearBtnClicks$.pipe(
        tap(() => {
            if (this.inputRef === undefined) return;
            this.inputRef.nativeElement.value = "";
        })
    );

    backspaces$: Observable<Array<string>> = this.inputChanges$.pipe(
        filter((event: KeyboardEvent) => event.key === "Backspace"),
        map(() => [])
    );

    refreshSuggestionsSignals$: Observable<Array<string>> = merge(
        this.clearInputSignals$,
        this.backspaces$
    ).pipe(map(() => []));

    suggestions$: Observable<Array<string>> = this.inputChanges$.pipe(
        debounceTime(200),
        map((event: KeyboardEvent) =>
            (event.target as HTMLInputElement).value.trim()
        ),
        distinctUntilChanged(),
        scan((acc: string[], curr: string) => (acc.push(curr), acc), []), // Take until click request to cancel
        delay(1000)
    );

    result$: Observable<string[]> = merge(
        this.refreshSuggestionsSignals$,
        this.suggestions$
    );

    ngAfterViewInit(): void {
        if (this.inputRef !== undefined) {
            merge(
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "keyup"),
                fromEvent<KeyboardEvent>(this.inputRef.nativeElement, "paste")
            )
                .pipe(takeUntil(this.destroySignals$))
                .subscribe(this.inputChanges$);
        }

        if (this.clearBtnRef !== undefined) {
            fromEvent<MouseEvent>(this.clearBtnRef.nativeElement, "click")
                .pipe(takeUntil(this.destroySignals$))
                .subscribe(this.clearBtnClicks$);
        }
    }

    ngOnDestroy(): void {
        if (this.destroySignals$) {
            this.destroySignals$.next(null);
            this.destroySignals$.complete();
        }
    }
}
