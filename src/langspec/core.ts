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

    public location(): SrcLoc {
        return Object.assign({}, this.srcloc);
    }

    public *read(n: number = 1): ResultSet<string> {
        let { line, char, absolute } = this.srcloc;
        absolute += n;
        if (absolute > this.content.length) {
            return;
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

    public *readWhile(f: (_: string) => boolean): ResultSet<string> {
        let { line, char, absolute } = this.srcloc;
        for (; absolute < this.content.length; absolute++) {
            if (!f(this.content[absolute]!)) {
                break;
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
        return this.content.length === this.srcloc.absolute;
    }
}

export interface Result<T> {
    reader: Reader;
    value: T;
}

export type ResultSet<T> = IteratorObject<Result<T>, void>;

export class Parser<T> {
    private readonly f: (reader: Reader) => ResultSet<T>;
    constructor(f: Parser<T>["f"]) {
        this.f = f
    }
    proceed(reader: Reader) {
        return this.f(reader)
    }
    exec(source: string, n: number = 1) {
        return [...this.proceed(new Reader(source)).take(n)];
    }
}

function withReader<T>(f: (_: Reader) => ResultSet<T>): Parser<T> {
    return new Parser(function* (reader: Reader) {
        yield* f(reader);
    });
}

export const bind = <X, Y>(p: Parser<X>, f: (x: X) => Parser<Y>) => withReader((reader) => p.proceed(reader).flatMap(({ reader, value }) => f(value).proceed(reader)));

export const rec = <T>(lazyP: () => Parser<T>): Parser<T> => new Parser((x: Reader) => lazyP().proceed(x));
export const once = <T>(p: Parser<T>): Parser<T> => withReader((reader) => p.proceed(reader).take(1));
export function alt2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2> {
    return new Parser<T1|T2>(function* (reader: Reader) {
        yield* p1.proceed(reader);
        yield* p2.proceed(reader);
        return;
    });
}
export const succ = <T>(value: T) => withReader((reader) => [{ reader, value }].values());
export const fail: Parser<never> = withReader((_) => [].values());
export const eof = <T>(value: T) => withReader((reader) => (reader.atEnd() ? [{ reader, value }] : []).values());
export const strN = (n: number = 1) => withReader((reader) => reader.read(n));
export const strWhile = (p: (x: string) => boolean = (_) => true) => withReader((reader) => reader.readWhile(p));

