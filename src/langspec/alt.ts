import { fail, succ } from './core.js';
import {
    type AlmostParser,
    type AlmostParserOutput,
    toParser,
} from './index.js';
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
