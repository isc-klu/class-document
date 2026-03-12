import {
    type AlmostParser,
    type AlmostParserOutput,
    fail,
    succ,
    toParser,
} from './core.js';
import { type Parser } from './core.js';

export function alt<T extends AlmostParser[]>(...ps: T) {
    return ps.reduce<Parser<AlmostParserOutput<T[number]>>>(
        (acc, p) => acc.alt2(toParser(p)),
        fail,
    );
}

export function optional<A, B = null>(p: Parser<A>, x?: B): Parser<A | B>;
export function optional(p: Parser<any>, x: any = null): Parser<any> {
    return p.alt2(succ(x));
}
