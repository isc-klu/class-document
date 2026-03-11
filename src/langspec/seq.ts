import { succ } from './core.js';
import { type Parser } from './core.js';

export function seq<T>(): Parser<T[]>;

export function seq<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<[T1, T2]>;

export function seq<T1, T2, T3>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
): Parser<[T1, T2, T3]>;

export function seq<T1, T2, T3, T4>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
): Parser<[T1, T2, T3, T4]>;

export function seq<T1, T2, T3, T4, T5>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
): Parser<[T1, T2, T3, T4, T5]>;

export function seq<T1, T2, T3, T4, T5, T6>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
): Parser<[T1, T2, T3, T4, T5, T6]>;

export function seq<T1, T2, T3, T4, T5, T6, T7>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
): Parser<[T1, T2, T3, T4, T5, T6, T7]>;

export function seq<T1, T2, T3, T4, T5, T6, T7, T8>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8]>;

export function seq<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
export function seq<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
export function seq<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
    p11: Parser<T11>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11]>;
export function seq<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
    p11: Parser<T11>,
    p12: Parser<T12>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12]>;
export function seq<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
    p11: Parser<T11>,
    p12: Parser<T12>,
    p13: Parser<T13>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13]>;
export function seq<
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
    p11: Parser<T11>,
    p12: Parser<T12>,
    p13: Parser<T13>,
    p14: Parser<T14>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14]>;
export function seq<
    T1,
    T2,
    T3,
    T4,
    T5,
    T6,
    T7,
    T8,
    T9,
    T10,
    T11,
    T12,
    T13,
    T14,
    T15,
>(
    p1: Parser<T1>,
    p2: Parser<T2>,
    p3: Parser<T3>,
    p4: Parser<T4>,
    p5: Parser<T5>,
    p6: Parser<T6>,
    p7: Parser<T7>,
    p8: Parser<T8>,
    p9: Parser<T9>,
    p10: Parser<T10>,
    p11: Parser<T11>,
    p12: Parser<T12>,
    p13: Parser<T13>,
    p14: Parser<T14>,
    p15: Parser<T15>,
): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15]>;

export function seq<T>(...ps: Parser<T>[]): Parser<T[]>;

export function seq<T>(...ps: Parser<T>[]): Parser<T[]> {
    return ps.reduce(
        (acc, p) => acc.seq2(p).map(([xs, x]) => [...xs, x]),
        succ([] as T[]),
    );
}
