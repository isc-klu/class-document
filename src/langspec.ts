export interface SrcLoc {
    line: number;
    char: number;
    absolute: number;
}

export class Reader {

    private readonly content: string;
    private readonly srcloc: SrcLoc;

    constructor(content: string, srcloc: SrcLoc = { line: 0, char: 0, absolute: 0 }) {
        this.content = content;
        this.srcloc = srcloc;
    }

    public charAt(n: number): string {
        return this.content.charAt(this.srcloc.absolute + n);
    }

    public * read(n: number = 1): ResultSet<string> {
        const result = this.content.slice(this.srcloc.absolute, this.srcloc.absolute + n);
        let { line, char, absolute } = this.srcloc;
        for (; absolute < this.content.length && n > 0; n--) {
            if (this.content[absolute] === "\n") {
                line += 1;
                char = 0;
            } else {
                char += 1;
            }
            absolute += 1;
        }
        if (n === 0) {
            const reader = new Reader(this.content, { line, char, absolute });
            yield { reader, value: result }
        }
        return null;
    }

    public atEnd() {
        return this.content.length === this.srcloc.absolute
    }

    public locate(): Result<SrcLoc> {
        return { reader: this, value: this.srcloc };
    }
}

export interface Result<T> {
    reader: Reader,
    value: T,
}

export type ResultSet<T> = Generator<Result<T>, null, undefined>;

export type Parser<T> = (reader: Reader) => ResultSet<T>

export function read(n: number = 1) {
    function* g(reader: Reader): Generator<Result<string>> {
        for (const o of reader.read(n)) {
            yield o;
        }
        return null;
    }
    return g
}

export const locate = (reader: Reader): Result<SrcLoc> => reader.locate();

export function succ<T>(value: T): Parser<T> {
    function* g(reader: Reader) {
        yield { reader, value }
        return null;
    };
    return g
}

export function* fail<T>(reader: Reader): ResultSet<T> { return null; };

export function seq2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<[T1, T2]> {
    function* g(reader: Reader): Generator<Result<[T1, T2]>> {
        for (const o1 of p1(reader)) {
            for (const o2 of p2(o1.reader)) {
                yield {
                    reader: o2.reader,
                    value: [o1.value, o2.value]
                }
            }
        }
        return;
    }
    return g
}

export function alt2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2> {
    function* g(reader: Reader) {
        yield* p1(reader);
        yield* p2(reader);
        return null;
    }
    return g;
}

export function map<T1, T2>(p: Parser<T1>, f: (x: T1) => T2): Parser<T2> {
    function* g(reader: Reader) {
        for (const o of p(reader)) {
            yield {
                reader: o.reader,
                value: f(o.value)
            }
        }
        return null;
    }
    return g;
}

export const rec = <T>(lazyP: () => Parser<T>): Parser<T> => {
    return (x) => lazyP()(x)
}

export function seq3<T1, T2, T3>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>): Parser<[T1, T2, T3]> {
    return map(seq2(p1, seq2(p2, p3)), ([x1, [x2, x3]]) => [x1, x2, x3])
}

export function seq4<T1, T2, T3, T4>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>): Parser<[T1, T2, T3, T4]> {
    return map(seq2(p1, seq2(p2, seq2(p3, p4))), ([x1, [x2, [x3, x4]]]) => [x1, x2, x3, x4])
}

export function seq5<T1, T2, T3, T4, T5>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>): Parser<[T1, T2, T3, T4, T5]> {
    return map(seq2(p1, seq4(p2, p3, p4, p5)), ([x1, x2345]) => [x1, ...x2345])
}

export const seq6 = <T1, T2, T3, T4, T5, T6>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>, p6: Parser<T6>): Parser<[T1, T2, T3, T4, T5, T6]> => map(seq2(seq3(p1, p2, p3), seq3(p4, p5, p6)), ([x123, x456]) => [...x123, ...x456])
export const seq7 = <T1, T2, T3, T4, T5, T6, T7>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>, p6: Parser<T6>, p7: Parser<T7>): Parser<[T1, T2, T3, T4, T5, T6, T7]> => map(seq2(seq4(p1, p2, p3, p4), seq3(p5, p6, p7)), ([x1234, x567]) => [...x1234, ...x567])
export const seq8 = <T1, T2, T3, T4, T5, T6, T7, T8>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>, p6: Parser<T6>, p7: Parser<T7>, p8: Parser<T8>): Parser<[T1, T2, T3, T4, T5, T6, T7, T8]> => map(seq2(seq4(p1, p2, p3, p4), seq4(p5, p6, p7, p8)), ([x, y]) => [...x, ...y])
export const seq9 = <T1, T2, T3, T4, T5, T6, T7, T8, T9>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>, p6: Parser<T6>, p7: Parser<T7>, p8: Parser<T8>, p9: Parser<T9>): Parser<[T1, T2, T3, T4, T5, T6, T7, T8, T9]> => map(seq2(seq4(p1, p2, p3, p4), seq5(p5, p6, p7, p8, p9)), ([x, y]) => [...x, ...y])

export function seqN<T>(...ps: Parser<T>[]): Parser<T[]> {
    return ps.reduceRight((acc, p) => map(seq2(p, acc), cons), succ([] as T[]));
}

export function altN<T>(...ps: Parser<T>[]): Parser<T> {
    return ps.reduceRight((acc, p) => alt2(p, acc), fail);
}

export function firstN(n: number, p: (x: string) => boolean = (_) => true): Parser<string> {
    function* g(reader: Reader) {
        for (const prefix of reader.read(n)) {
            if (p(prefix.value)) {
                yield prefix
            }
        }
        return null;
    }
    return g
}

export function chars(p: (x: string) => boolean = (_) => true): Parser<string> {
    function* g(reader: Reader) {
        let n = 0;
        while (reader.charAt(n).length > 0 && p(reader.charAt(n))) {
            n++;
        }
        for (; n >= 0; n--) {
            yield* reader.read(n)
        }
        return null;
    }
    return g
}

export function someChars(p: (x: string) => boolean = (_) => true): Parser<string> {
    function* g(reader: Reader) {
        let n = 0;
        while (reader.charAt(n).length > 0 && p(reader.charAt(n))) {
            n++;
        }
        for (; n >= 1; n--) {
            yield* reader.read(n)
        }
        return null;
    }
    return g
}

export function literal<T extends string>(x: T): Parser<T> {
    return firstN(x.length, (y) => y === x) as Parser<T>;
}

export function LiTeRaL<T extends string>(x: T): Parser<T> {
    return firstN(x.length, (y) => y.toLocaleLowerCase() === x.toLocaleLowerCase()) as Parser<T>;
}

export const join = (xs: string[]) => xs.join("")
export const cons = <T>([x, xs]: [T, T[]]) => [x, ...xs]

export function repeat<T>(x: Parser<T>): Parser<T[]> {
    function* g(reader: Reader): ResultSet<T[]> {
        const stack: [ResultSet<T>, Result<T[]>][] = [[x(reader), { reader, value: [] }]];
        while (stack.length > 0) {
            const [gen, r1] = stack[0]!;
            const { value, done } = gen.next();
            if (done) {
                yield r1;
                stack.shift()
            } else {
                const r2: Result<T> = value!;
                stack.unshift([
                    x(r2.reader),
                    { reader: r2.reader, value: [...r1.value, r2.value] }
                ])
            }
        }
        return null;
    }
    return g;
}

export const repeatSome = <T>(p: Parser<T>) => {
    return map(seq2(p, repeat(p)), cons)
}

export function sepList<I, S>(pi: Parser<I>, ps: Parser<S>): Parser<[I[], S[]]> {
    return alt2(
        map(seq2(pi, repeat(seq2(ps, pi))), ([x, xys]) => {
            const xs: I[] = [x];
            const ys: S[] = [];
            for (const [y, x] of xys) {
                xs.push(x);
                ys.push(y);
            }
            return [xs, ys];
        }),
        succ([[], []])
    )
}

export const oneOff = <T>(p: Parser<T>): Parser<T> => {
    function* g(reader: Reader) {
        for (const x of p(reader)) {
            yield x;
            return null;
        }
        return null;
    }
    return g
}

export const isChar = (x: string) => x.length === 1
export const isButNL = (x: string) => /[^\n]/.test(x)
export const isSpace = (x: string) => /\s/.test(x)
export const isSpaceButNL = (x: string) => /[\t\r ]/.test(x)
export const isAlpha = (x: string) => /[a-z]/.test(x)
export const isALPHA = (x: string) => /[A-Z]/.test(x)
export const isAlPhA = (x: string) => /[a-z]/i.test(x)
export const isNumeral = (x: string) => /[0-9]/.test(x)


export function take1<T>(r: ResultSet<T>): Result<T> | null {
    for (const o of r) {
        return o;
    }
    return null;
}

export function takeAll<T>(r: ResultSet<T>): Result<T>[] {
    return [...r];
}

export const doubleQuotedContent = map(
    oneOff(repeat(altN(
        // backslash followed by anything but newline
        firstN(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        firstN(1, (c) => /[^\\\n"]/.test(c)),
    ))),
    join
)
export const singleQuotedContent = map(
    oneOff(repeat(altN(
        // backslash followed by anything but newline
        firstN(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        firstN(1, (c) => /[^\\\n']/.test(c)),
    ))),
    join
)
export const singleLineString = altN(
    map(seq3(literal('"'), doubleQuotedContent, literal('"')), join),
    map(seq3(literal("'"), singleQuotedContent, literal("'")), join)
)
export const anythingBalanced: Parser<string> = rec(() => map(
    repeat(
        altN(
            oneOff(someChars((c) => /[^()\[\]\{\}<>"']/.test(c))),
            singleLineString,
            map(seq3(literal('('), anythingBalanced, literal(')')), join),
            map(seq3(literal('['), anythingBalanced, literal(']')), join),
            map(seq3(literal('{'), anythingBalanced, literal('}')), join),
            map(seq3(literal('<'), anythingBalanced, literal('>')), join),
        )
    ),
    join)
)

export const eof
    = <T>(value: T): Parser<T> => {
        function* g(reader: Reader) {
            if (reader.atEnd()) {
                yield { reader, value };
            }
            return null;
        }
        return g;
    }
