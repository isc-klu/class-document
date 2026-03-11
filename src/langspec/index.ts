import { alt, optional } from "./alt.js";
import { seq } from "./seq.js";
import { bind, fail, strN, strWhile, succ, type Parser } from "./core.js";

export function map<X, Y>(p: Parser<X>, f: (x: X) => Y): Parser<Y> {
    return bind(p, (x) => succ(f(x)))
}

export function filter<T>(p: Parser<T>, f: (_: T) => boolean): Parser<T> {
    return bind(p, (x) => f(x) ? succ(x) : fail)
}

export function strIf(n: number, p: (x: string) => boolean = (_) => true): Parser<string> {
    return filter(strN(n), p)
}

export function str<T extends string>(x: T): Parser<T> {
    return strIf(x.length, (y) => y === x) as Parser<T>;
}

// case-insensitive version
export function StR<T extends string>(x: T): Parser<T> {
    return strIf(x.length, (y) => y.toLocaleLowerCase() === x.toLocaleLowerCase()) as Parser<T>;
}

export function strWhile1(p: (x: string) => boolean = (_) => true): Parser<string> {
    return filter(strWhile(p), (x) => x.length > 0)
}

const repeatWithAcc = <T>(xs: T[], x: Parser<T>): Parser<T[]> =>
    alt(repeat1WithAcc(xs, x), succ(xs))
const repeat1WithAcc = <T>(xs: T[], x: Parser<T>): Parser<T[]> =>
    bind(x, (xv) => repeatWithAcc([...xs, xv], x))

export const repeat = <T>(x: Parser<T>) => repeatWithAcc([], x)
export const repeat1 = <T>(x: Parser<T>) => repeat1WithAcc([], x)

export function repeatSep<I, S>(pi: Parser<I>, ps: Parser<S>): Parser<[I[], S[]]> {
    return optional(
        map(seq(pi, repeat(seq(ps, pi))), ([x, xys]) => {
            const xs: I[] = [x];
            const ys: S[] = [];
            for (const [y, x] of xys) {
                xs.push(x);
                ys.push(y);
            }
            return [xs, ys];
        }),
        [[], []]
    )
}
export const repeatSepWithStr = <T>(x: Parser<T>, s: string) =>
    drop2(repeatSep(x, str(s)))

export const isLetter = (x: string) => /[\p{L}\p{M}]/u.test(x)
export const isNumeral = (x: string) => /\p{N}/u.test(x)
export const isSymbol = (x: string) => /[\p{S}\p{P}]/u.test(x)
export const isSpace = (x: string) => /[\p{Z}\p{C}]/u.test(x)

export const isChar = (x: string) => x.length === 1
export const isButNL = (x: string) => /[^\n]/.test(x)
export const isSpaceButNL = (x: string) => /[\t\r ]/.test(x)

export const flatten = (p: Parser<string[]>): Parser<string> => {
    return map(p, ((xs: string[]) => xs.join("")))
}

export const drop13 = <T1, T2, T3>(p: Parser<[T1, T2, T3]>) => {
    return map(p, ([_1, x, _2]) => x)
}

export const drop15 = <T1, T2, T3, T4, T5>(p: Parser<[T1, T2, T3, T4, T5]>): Parser<[T2, T3, T4]> => {
    return map(p, ([_1, x2, x3, x4, _5]) => [x2, x3, x4])
}

export const drop1 = <T1, T2>(p: Parser<[T1, T2]>) => {
    return map(p, ([x, _]) => x)
}

export const drop2 = <T1, T2>(p: Parser<[T1, T2]>) => {
    return map(p, ([x, _]) => x)
}

export function seqFlatten(...ps: Parser<string>[]): Parser<string> {
    return flatten(seq(...ps))
}

export function seqDrop2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1> {
    return drop2(seq(p1, p2))
}

export function seqDrop13<T>(p1: string, p2: Parser<T>, p3: string): Parser<T> {
    return drop13(seq(str(p1), p2, str(p3)))
}

export function seqDrop15<T1, T2, T3, T4, T5>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>): Parser<[T2, T3, T4]> {
    return drop15(seq(p1, p2, p3, p4, p5))
}

export const dbg = <T>(p: Parser<T>, where = "DBG") => 
    map(p, (x) => {
        console.log(`${where}: ` + JSON.stringify(x))
        return x
    })
