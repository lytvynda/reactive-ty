import { catchError, concat, map, Observable, of } from "rxjs";

type LoadingStatus = {
    status: "loading";
};

type ErrorStatus = {
    status: "error";
    error: Error;
};

type ResolvedStatus<T> = {
    status: "resolved";
    value: T;
};

type ProclaimedStatus<T> = LoadingStatus | ResolvedStatus<T> | ErrorStatus;

/**
 * Enhances an Observable with status proclamation, indicating loading, resolution, or error status.
 *
 * @template T The type of the values emitted by the original Observable.
 * @param {Observable<T>} observable The original Observable to enhance with status proclamation.
 * @returns {Observable<ProclaimedStatus<T>>} An Observable with added status information.
 */
function withStatusProclaim<T>(
    observable: Observable<T>
): Observable<ProclaimedStatus<T>> {
    const initial: Observable<LoadingStatus> = of({ status: "loading" });
    const wrapped: Observable<ProclaimedStatus<T>> = observable.pipe(
        map((value: T) => ({ status: "resolved", value }) as ResolvedStatus<T>),
        catchError((error: Error) =>
            of({ status: "error", error } as ErrorStatus)
        )
    );
    return concat(initial, wrapped);
}

export { withStatusProclaim };
export type { ProclaimedStatus };
