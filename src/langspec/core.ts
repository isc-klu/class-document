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

export type Parser<T> = [(reader: Reader) => ResultSet<T>];

export function withReader<T>(f: (_: Reader) => ResultSet<T>): Parser<T> {
    return [function* (reader: Reader) {
        yield* f(reader);
    }];
}
export const bind = <X, Y>(p: Parser<X>, f: (x: X) => Parser<Y>) => withReader((reader) => p[0](reader).flatMap(({ reader, value }) => f(value)[0](reader)));
export const rec = <T>(lazyP: () => Parser<T>): Parser<T> => [(x: Reader) => lazyP()[0](x)];
export const once = <T>(p: Parser<T>): Parser<T> => withReader((reader) => p[0](reader).take(1));
export function alt2<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2> {
    return [function* g(reader: Reader) {
        yield* p1[0](reader);
        yield* p2[0](reader);
        return;
    }];
}
export function exec<T>(p: Parser<T>, source: string, n: number = 1) {
    return [...p[0](new Reader(source)).take(n)];
}
