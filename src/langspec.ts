import { alt, optional } from "./alt.js";
import { seq } from "./seq.js";

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
        let { line, char, absolute } = this.srcloc;
        absolute += n;
        if (absolute > this.content.length) {
            return null
        }
        for (; n > 0; n--) {
            if (this.content[absolute] === "\n") {
                line += 1;
                char = 0;
            } else {
                char += 1;
            }
        }
        yield { 
            reader: new Reader(this.content, { line, char, absolute }),
            value: this.content.slice(this.srcloc.absolute, absolute)
        };
    }

    public * readWhile(f: (_: string) => boolean): ResultSet<string> {
        let { line, char, absolute } = this.srcloc;
        for (; absolute < this.content.length; absolute ++) {
            if (! f(this.content[absolute]!)) {
                break
            }
            if (this.content[absolute] === "\n") {
                line += 1;
                char = 0;
            } else {
                char += 1;
            }
        }
        yield { 
            reader: new Reader(this.content, { line, char, absolute }),
            value: this.content.slice(this.srcloc.absolute, absolute)
        };
    }

    public atEnd(): boolean {
        return this.content.length === this.srcloc.absolute
    }
}

export interface Result<T> {
    reader: Reader,
    value: T,
}

export type ResultSet<T> = Generator<Result<T>>;

export type Parser<T> = (reader: Reader) => ResultSet<T>

export function map<X, Y>(p: Parser<X>, f: (x: X) => Y): Parser<Y> {
    function* g(reader: Reader) {
        yield* p(reader).map(({ reader, value }) => ({ reader, value: f(value) }))
    }
    return g;
}

export function bind<X, Y>(p: Parser<X>, f: (x: X) => Parser<Y>): Parser<Y> {
    return function* (reader: Reader) {
        for (const r1 of p(reader)) {
            yield *f(r1.value)(r1.reader)
        }        
    }
}

export function succ<T>(value: T): Parser<T> {
    function* g(reader: Reader) {
        yield { reader, value }
    };
    return g
}

export function* fail<T>(_: Reader): ResultSet<T> { return null; };

export function filter<T>(p: Parser<T>, f: (_: T) => boolean): Parser<T> {
    return bind(p, (x) => f(x) ? succ(x) : fail<T>)
}

export function read(n: number = 1) {
    return function* (reader: Reader): Generator<Result<string>> {
        yield* reader.read(n)
    }
}

export function readWhile(p: (x: string) => boolean = (_) => true): Parser<string> {
    return function* (reader: Reader) {
        yield* reader.readWhile(p)
    }
}

export function readIf(n: number, p: (x: string) => boolean = (_) => true): Parser<string> {
    return filter(read(n), p)
}

export function readStr<T extends string>(x: T): Parser<T> {
    return readIf(x.length, (y) => y === x) as Parser<T>;
}

export function readStR<T extends string>(x: T): Parser<T> {
    return readIf(x.length, (y) => y.toLocaleLowerCase() === x.toLocaleLowerCase()) as Parser<T>;
}

export function readWhile1(p: (x: string) => boolean = (_) => true): Parser<string> {
    return filter(readWhile(p), (x) => x.length > 0)
}

export const rec = <T>(lazyP: () => Parser<T>): Parser<T> => {
    return (x) => lazyP()(x)
}

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

export const repeat1 = <T>(p: Parser<T>) => {
    return map(seq(p, repeat(p)), cons)
}

export function repeatSep<I, S>(pi: Parser<I>, ps: Parser<S>): Parser<[I[], S[]]> {
    return optional(
        map(seq(pi, repeat(seq(ps, pi))), ([x, xys]) => {
            const xs: I[] = [x];
            const ys: S[] = [];
            for (const [y, x] of xys) {
                xs.push(x);
                ys.push(y);
            }
            return [xs, ys];
        }),
        [[], []]
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

export const flatten = (p: Parser<string[]>): Parser<string> => {
    return map(p, ((xs: string[]) => xs.join("")))
}

export const drop13 = <T1, T2, T3>(p: Parser<[T1, T2, T3]>) => {
    return map(p, ([_1, x, _2]) => x)
}

export const drop15 = <T1, T2, T3, T4, T5>(p: Parser<[T1, T2, T3, T4, T5]>): Parser<[T2, T3, T4]> => {
    return map(p, ([_1, x2, x3, x4, _5]) => [x2, x3, x4])
}

export const drop1 = <T1, T2>(p: Parser<[T1, T2]>) => {
    return map(p, ([x, _]) => x)
}

export const drop2 = <T1, T2>(p: Parser<[T1, T2]>) => {
    return map(p, ([x, _]) => x)
}


export const doubleQuotedContent = flatten(
    oneOff(repeat(alt(
        // backslash followed by anything but newline
        readIf(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        readIf(1, (c) => /[^\\\n"]/.test(c)),
    )))
)
export const singleQuotedContent = flatten(
    oneOff(repeat(alt(
        // backslash followed by anything but newline
        readIf(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        readIf(1, (c) => /[^\\\n']/.test(c)),
    )))
)
export const singleLineString = alt(
    seqFlatten(readStr('"'), doubleQuotedContent, readStr('"')),
    seqFlatten(readStr("'"), singleQuotedContent, readStr("'"))
)
export const anythingBalanced: Parser<string> = rec(() => flatten(
    repeat(
        alt(
            oneOff(readWhile1((c) => /[^()\[\]\{\}<>"']/.test(c))),
            singleLineString,
            seqFlatten(readStr('('), anythingBalanced, readStr(')')),
            seqFlatten(readStr('['), anythingBalanced, readStr(']')),
            seqFlatten(readStr('{'), anythingBalanced, readStr('}')),
            seqFlatten(readStr('<'), anythingBalanced, readStr('>')),
        )
    )
))

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

export function seqFlatten(...ps: Parser<string>[]): Parser<string> {
    return flatten(seq(...ps))
}

export function seqDrop2<T1,T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1> {
    return drop2(seq(p1, p2))
}

export function seqDrop13<T1,T2,T3>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>): Parser<T2> {
    return drop13(seq(p1, p2, p3))
}

export function seqDrop15<T1, T2, T3, T4, T5>(p1: Parser<T1>, p2: Parser<T2>, p3: Parser<T3>, p4: Parser<T4>, p5: Parser<T5>): Parser<[T2, T3, T4]> {
    return drop15(seq(p1, p2, p3, p4, p5))
}