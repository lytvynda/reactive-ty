import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class CacheService {
    private readonly cache = new Map<string, Observable<unknown>>();

    setItem(key: string, item: Observable<unknown>): void {
        this.cache.set(key, item);
    }

    getItem(key: string): Observable<unknown> | undefined {
        return this.cache.get(key);
    }
}
