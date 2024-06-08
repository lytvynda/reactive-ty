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


export { mod };
