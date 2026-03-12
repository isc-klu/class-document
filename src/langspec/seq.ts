import { succ } from './core.js';
import {
    toParser,
    type AlmostParser,
    type AlmostParserOutput,
} from './index.js';
import { type Parser } from './core.js';

export function seq<T extends AlmostParser[]>(
    ...ps: T
): Parser<{ [K in keyof T]: AlmostParserOutput<T[K]> }> {
    return ps.reduce(
        (acc: Parser<any>, p) =>
            acc.seq2(toParser(p)).map(([xs, x]) => [...xs, x]),
        succ([] as any),
    );
}
