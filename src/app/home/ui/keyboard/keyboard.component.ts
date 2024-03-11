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
import { untilDestroyed } from "@shared/utils/operators";
import { Subject, distinctUntilChanged, filter, map, tap } from "rxjs";

type KeyboardKeyCode = { c: string };

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
            `translate(-70%, ${translateY}%) rotate(-20deg)`
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

const keyboardMatrix: Array<Array<KeyboardKeyCode>> = [
    [
        { c: "Backquote" },
        { c: "Digit1" },
        { c: "Digit2" },
        { c: "Digit3" },
        { c: "Digit4" },
        { c: "Digit5" },
        { c: "Digit6" },
        { c: "Digit7" },
        { c: "Digit8" },
        { c: "Digit9" },
        { c: "Digit0" },
        { c: "Minus" },
        { c: "Equal" },
        { c: "Backspace" },
    ],
    [
        { c: "Tab" },
        { c: "KeyQ" },
        { c: "KeyW" },
        { c: "KeyE" },
        { c: "KeyR" },
        { c: "KeyT" },
        { c: "KeyY" },
        { c: "KeyU" },
        { c: "KeyI" },
        { c: "KeyO" },
        { c: "KeyP" },
        { c: "BracketLeft" },
        { c: "BracketRight" },
        { c: "Backslash" },
    ],
    [
        { c: "CapsLock" },
        { c: "KeyA" },
        { c: "KeyS" },
        { c: "KeyD" },
        { c: "KeyF" },
        { c: "KeyG" },
        { c: "KeyH" },
        { c: "KeyJ" },
        { c: "KeyK" },
        { c: "KeyL" },
        { c: "Semicolon" },
        { c: "Quote" },
        { c: "Enter" },
    ],
    [
        { c: "ShiftLeft" },
        { c: "KeyZ" },
        { c: "KeyX" },
        { c: "KeyC" },
        { c: "KeyV" },
        { c: "KeyB" },
        { c: "KeyN" },
        { c: "KeyM" },
        { c: "Comma" },
        { c: "Period" },
        { c: "Slash" },
        { c: "ShiftRight" },
    ],
    [
        { c: "ControlLeft" },
        { c: "MetaLeft" },
        { c: "AltLeft" },
        { c: "Space" },
        { c: "AltRight" },
        { c: "Fn" }, // No events fired actually
        { c: "ContextMenu" },
        { c: "ControlRight" },
    ],
];
