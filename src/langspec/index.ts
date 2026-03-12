export * from './alt.js';
export * from './seq.js';
export type ParserTuple<T extends any[]> = {
    [K in keyof T]: Parser<T[K]>;
};

export type AlmostParser = Parser<any> | string;

export type AlmostParserOutput<T> =
    T extends Parser<infer T> ? T : T extends string ? T : never;

export type ToParser<T> = Parser<AlmostParserOutput<T>>;

export const toParser = <T extends AlmostParser>(
    from: T,
): Parser<AlmostParserOutput<T>> =>
    typeof from === 'string'
        ? (str(from) as Parser<AlmostParserOutput<T>>)
        : from;
export const repeat = <T>(x: Parser<T>) => repeatWithAcc([], x);

export * from './core.js';
import { seq } from './seq.js';
import { filter, repeatWithAcc, str, strWhile, type Parser } from './core.js';
import { optional } from './alt.js';

export function strWhile1(
    p: (x: string) => boolean = (_) => true,
): Parser<string> {
    return filter(strWhile(p), (x) => x.length > 0);
}

export function repeatSep<I, S>(
    pi: Parser<I>,
    ps: Parser<S>,
): Parser<[I[], S[]]> {
    return optional(
        seq(pi, repeat(seq(ps, pi))).map(([x, xys]) => {
            const xs: I[] = [x];
            const ys: S[] = [];
            for (const [y, x] of xys) {
                xs.push(x);
                ys.push(y);
            }
            return [xs, ys];
        }),
        [[], []],
    );
}
export const repeatSepWithStr = <T>(x: Parser<T>, s: string) =>
    (<T1, T2>(p: Parser<[T1, T2]>) => {
        return p.map(([x, _]) => x);
    })(repeatSep(x, str(s)));

export const isLetter = (x: string) => /[\p{L}\p{M}]/u.test(x);
export const isNumeral = (x: string) => /\p{N}/u.test(x);
export const isSymbol = (x: string) => /[\p{S}\p{P}]/u.test(x);
export const isSpace = (x: string) => /[\p{Z}\p{C}]/u.test(x);

export const isChar = (x: string) => x.length === 1;
export const isNotNL = (x: string) => /[^\n]/.test(x);
export const isSpaceButNL = (x: string) => /[\t\r ]/.test(x);
