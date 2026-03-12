import { alt, optional } from './alt.js';
import { seq } from './seq.js';
import { filter, strN, strWhile, succ, type Parser } from './core.js';

export function strIf(
    n: number,
    p: (x: string) => boolean = (_) => true,
): Parser<string> {
    return filter(strN(n), p);
}

export function str<T extends string>(x: T): Parser<T> {
    return strIf(x.length, (y) => y === x) as Parser<T>;
}

// case-insensitive version
export function StR<T extends string>(x: T): Parser<string> {
    return strIf(
        x.length,
        (y) => y.toLocaleLowerCase() === x.toLocaleLowerCase(),
    ) as Parser<T>;
}

export function strWhile1(
    p: (x: string) => boolean = (_) => true,
): Parser<string> {
    return filter(strWhile(p), (x) => x.length > 0);
}

const repeatWithAcc = <T>(xs: T[], x: Parser<T>): Parser<T[]> =>
    alt(repeat1WithAcc(xs, x), succ(xs));
const repeat1WithAcc = <T>(xs: T[], x: Parser<T>): Parser<T[]> =>
    x.bind((xv) => repeatWithAcc([...xs, xv], x));

export const repeat = <T>(x: Parser<T>) => repeatWithAcc([], x);
export const repeat1 = <T>(x: Parser<T>) => repeat1WithAcc([], x);

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
export const isButNL = (x: string) => /[^\n]/.test(x);
export const isSpaceButNL = (x: string) => /[\t\r ]/.test(x);

export const dbg = <T>(p: Parser<T>, where = 'DBG') =>
    p.map((x) => {
        console.log(`${where}: ` + JSON.stringify(x));
        return x;
    });

type FunctionOf<T> = (_: T) => never;

type CommonInput<T> = [T] extends [(_: infer I) => never] ? I : never;

type UnionToIntersection<T> = CommonInput<
    T extends any ? FunctionOf<T> : never
>;

type Intersection<T extends any[]> = UnionToIntersection<T[number]>;

export const compose = <T extends any[]>(
    p: Parser<T>,
): Parser<Intersection<T>> =>
    p.map((xs) => Object.assign({}, ...xs) as Intersection<T>);
