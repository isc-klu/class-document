import {
    toParser,
    succ,
    type AlmostParser,
    type AlmostParserOutput,
} from './core.js';
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
