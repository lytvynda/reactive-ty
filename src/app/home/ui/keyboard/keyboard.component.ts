import {
    Component,
    ChangeDetectionStrategy,
    AfterViewInit,
    OnDestroy,
    ViewChild,
    ElementRef,
    HostListener,
    ViewChildren,
    QueryList,
} from "@angular/core";
import { untilDestroyed } from "@shared/operators";
import { Subject, distinctUntilChanged, filter, map, tap } from "rxjs";

@Component({
    selector: "app-keyboard",
    templateUrl: "./keyboard.component.html",
    styleUrl: "./keyboard.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardComponent implements AfterViewInit, OnDestroy {
    @ViewChild("keyboard", { static: true, read: ElementRef })
    keyboardRef: ElementRef<HTMLDivElement> | undefined;

    @ViewChildren("key", { read: ElementRef })
    keys: QueryList<ElementRef> | undefined;

    protected keyboardMatrix = keyboardMatrix;
    protected resizeObserver = new ResizeObserver(this.handleResize.bind(this));
    protected keyEvent$ = new Subject<KeyboardEvent>();
    private untilDestroyed = untilDestroyed();

    @HostListener("document:keyup", ["$event"])
    @HostListener("document:keydown", ["$event"])
    handleKeyEvent(event: KeyboardEvent) {
        this.keyEvent$.next(event);
    }

    handleKeyEvent$ = this.keyEvent$.pipe(
        map((event) => ({ type: event.type, code: event.code })),
        distinctUntilChanged(
            (prev, curr) =>
                `${prev.code}${prev.type}` === `${curr.code}${curr.type}`
        ),
        map((payload) => ({
            ...payload,
            targetKey: this.getKeyRefByKeyboardCode(this.keys!, payload.code),
        })),
        filter((payload) => payload?.targetKey !== undefined),
        tap((payload) => {
            if (payload.type === "keydown") {
                payload.targetKey!.nativeElement.setAttribute(
                    "data-pressed",
                    "on"
                );
            } else {
                payload.targetKey!.nativeElement.removeAttribute(
                    "data-pressed"
                );
            }
        })
    );

    getKeyRefByKeyboardCode(
        elements: QueryList<ElementRef>,
        keyboardCode: string
    ) {
        if (elements === undefined) return;

        return elements.find(
            (nodeRef) => nodeRef.nativeElement.dataset.key === keyboardCode
        );
    }

    handleResize(entries: ResizeObserverEntry[], observer: ResizeObserver) {
        if (!entries.length || !this.keyboardRef) return;

        const viewportWidth = entries[0].contentRect.width;
        const maxY = -10;
        const minY = -20;
        let translateY = 0;

        if (viewportWidth >= 1534) {
            translateY = minY;
        } else if (viewportWidth <= 1200) {
            translateY = maxY;
        } else {
            translateY =
                maxY +
                ((viewportWidth - 1200) / (1536 - 1200)) *
                    Math.abs(minY - maxY);
        }

        this.keyboardRef.nativeElement.style.setProperty(
            "transform",
            `translate(-80%, ${translateY}%) rotate(-25deg)`
        );
    }

    ngAfterViewInit(): void {
        this.resizeObserver.observe(document.body);
        this.handleKeyEvent$.pipe(this.untilDestroyed()).subscribe();
    }

    ngOnDestroy(): void {
        this.resizeObserver.disconnect();
    }
}

const keyboardMatrix: Array<Array<string>> = [
    [
        "Backquote",
        "Digit1",
        "Digit2",
        "Digit3",
        "Digit4",
        "Digit5",
        "Digit6",
        "Digit7",
        "Digit8",
        "Digit9",
        "Digit0",
        "Minus",
        "Equal",
        "Backspace",
    ],
    [
        "Tab",
        "KeyQ",
        "KeyW",
        "KeyE",
        "KeyR",
        "KeyT",
        "KeyY",
        "KeyU",
        "KeyI",
        "KeyO",
        "KeyP",
        "BracketLeft",
        "BracketRight",
        "Backslash",
    ],
    [
        "CapsLock",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyF",
        "KeyG",
        "KeyH",
        "KeyJ",
        "KeyK",
        "KeyL",
        "Semicolon",
        "Quote",
        "Enter",
    ],
    [
        "ShiftLeft",
        "KeyZ",
        "KeyX",
        "KeyC",
        "KeyV",
        "KeyB",
        "KeyN",
        "KeyM",
        "Comma",
        "Period",
        "Slash",
        "ShiftRight",
    ],
    [
        "ControlLeft",
        "MetaLeft",
        "AltLeft",
        "Space",
        "AltRight",
        "Fn", // No events fired actually
        "ContextMenu",
        "ControlRight",
    ],
];
