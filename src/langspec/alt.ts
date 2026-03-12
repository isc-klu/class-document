import { fail, type Parsers, succ } from './core.js';
import { type Parser } from './core.js';


export function alt<T extends any[]>(...ps: Parsers<T>): Parser<T[number]> {
    return ps.reduceRight((acc, p) => p.alt2(acc), fail);
}

export function optional<A, B = null>(p: Parser<A>, x?: B): Parser<A | B>;
export function optional(p: Parser<any>, x: any = null): Parser<any> {
    return p.alt2(succ(x));
}
