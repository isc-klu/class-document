import { type Parser, Reader, fail, succ } from "./index.js";

export function alt2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2> {
    function* g(reader: Reader) {
        yield* p1(reader);
        yield* p2(reader);
        return;
    }
    return g;
}

export function alt<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2>;
export function alt<T>(...ps: Parser<T>[]): Parser<T>;
export function alt<T>(...ps: Parser<T>[]): Parser<T> {
    return ps.reduceRight((acc, p) => alt2(p, acc), fail);
}export function optional<A, B = null>(p: Parser<A>, x?: B): Parser<A | B>;
export function optional(p: Parser<any>, x: any = null): Parser<any> {
    return alt2(p, succ(x));
}

