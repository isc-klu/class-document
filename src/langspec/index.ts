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
export function StR<T extends string>(x: T): Parser<T> {
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

export const flatten = (p: Parser<string[]>): Parser<string> => {
    return p.map((xs: string[]) => xs.join(''));
};

export function seqFlatten(...ps: Parser<string>[]): Parser<string> {
    return flatten(seq(...ps));
}

export function seqDrop2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1> {
    return seq(p1, p2).map(([x, _]) => x);
}

export function seqDrop13<T>(p1: string, p2: Parser<T>, p3: string): Parser<T> {
    return seq(str(p1), p2, str(p3)).map(([_1, x, _2]) => x);
}

export const dbg = <T>(p: Parser<T>, where = 'DBG') =>
    p.map((x) => {
        console.log(`${where}: ` + JSON.stringify(x));
        return x;
    });
