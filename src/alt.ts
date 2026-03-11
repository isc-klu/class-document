import { type Parser, Reader, fail } from "./langspec.js";

export function alt2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2> {
    function* g(reader: Reader) {
        yield* p1(reader);
        yield* p2(reader);
        return null;
    }
    return g;
}

export function alt<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2>;
export function alt<T>(...ps: Parser<T>[]): Parser<T>;
export function alt<T>(...ps: Parser<T>[]): Parser<T> {
    return ps.reduceRight((acc, p) => alt2(p, acc), fail);
}
