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
    filter,
    tap,
} from "rxjs";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent implements AfterViewInit, OnDestroy {
    @ViewChild("inputBox", { static: true })
    inputRef: ElementRef | undefined;

    results$ = new Subject<string[]>();
    private destroy$ = new ReplaySubject<null>();

    ngAfterViewInit(): void {
        fromEvent<KeyboardEvent>(this.inputRef?.nativeElement, "keyup")
            .pipe(
                debounceTime(300),
                map((event) => (event.target as HTMLInputElement).value.trim()),
                filter(Boolean),
                distinctUntilChanged(),
                scan(
                    (acc: string[], curr: string) => (acc.push(curr), acc),
                    []
                ),
                takeUntil(this.destroy$),
                tap(console.log)
            )
            .subscribe(this.results$);
    }

    ngOnDestroy(): void {
        if (this.destroy$) {
            this.destroy$.next(null);
            this.destroy$.complete();
        }
    }
}
