import { mod } from ".";

describe(`[utils] '${mod.name}' function`, () => {
    const table: [number, number, number][] = [
        [5, 12, 5],
        [12, 5, 2],
        [-5, 12, 7],
        [12, -5, -3],
        [240, 13, 6],
        [8, -3, -1],
    ];

    for (const [dividend, modulus, expected] of table) {
        it(`${dividend} % ${modulus} should return ${expected}`, () => {
            expect(mod(dividend, modulus)).toBe(expected);
        });
    }
});
