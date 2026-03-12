import { succ, type Parsers } from './core.js';
import { type Parser } from './core.js';

export function seq<T extends any[]>(...ps: Parsers<T>): Parser<T> {
    return ps.reduce(
        (acc, p) => acc.seq2(p).map(([xs, x]) => [...xs, x]),
        succ([] as T[]),
    );
}
