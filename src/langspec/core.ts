export interface SrcLoc {
    line: number;
    char: number;
    absolute: number;
}

export class Reader {
    private readonly content: string;
    private readonly srcloc: SrcLoc;

    constructor(
        content: string,
        srcloc: SrcLoc = { line: 0, char: 0, absolute: 0 },
    ) {
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
            if (this.content[absolute] === '\n') {
                line += 1;
                char = 0;
            } else {
                char += 1;
            }
        }
        yield {
            reader: new Reader(this.content, { line, char, absolute }),
            value: this.content.slice(this.srcloc.absolute, absolute),
        };
    }

    public *readWhile(f: (_: string) => boolean): ResultSet<string> {
        let { line, char, absolute } = this.srcloc;
        for (; absolute < this.content.length; absolute++) {
            if (!f(this.content[absolute]!)) {
                break;
            }
            if (this.content[absolute] === '\n') {
                line += 1;
                char = 0;
            } else {
                char += 1;
            }
        }
        yield {
            reader: new Reader(this.content, { line, char, absolute }),
            value: this.content.slice(this.srcloc.absolute, absolute),
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

type DropFst<T extends any[]> = T extends [infer _, ...infer R] ? R : never;
type DropLst<T extends any[]> = T extends [...infer R, infer _] ? R : never;
type DropFL<T> = T extends [infer _, ...infer R, infer _] ? R : never;

type TakeM<T> = T extends [infer _, infer R, infer _] ? R : never;

type FunctionOf<T> = (_: T) => never;

type CommonInput<T> = [T] extends [(_: infer I) => never] ? I : never;

type UnionToIntersection<T> = CommonInput<
    T extends any ? FunctionOf<T> : never
>;

type Condense<T> = Pick<T, keyof T>;

type Intersection<T> = Condense<
    T extends any[] ? UnionToIntersection<T[number]> : never
>;

export const compose = <T extends any[]>(
    p: Parser<T>,
): Parser<Intersection<T>> =>
    p.map((xs) => Object.assign({}, ...xs) as Intersection<T>);

export class Parser<A> {
    private readonly f: (reader: Reader) => ResultSet<A>;
    constructor(f: Parser<A>['f']) {
        this.f = f;
    }
    proceed(reader: Reader) {
        return this.f(reader);
    }
    public exec(source: string, n: number = 1) {
        return [...this.proceed(new Reader(source)).take(n)];
    }
    public bind<B>(f: (x: A) => Parser<B>) {
        return withReader((reader) =>
            this.proceed(reader).flatMap(({ reader, value }) =>
                f(value).proceed(reader),
            ),
        );
    }
    public alt2<B>(p2: Parser<B>): Parser<A | B> {
        const p1 = this;
        return new Parser<A | B>(function* (reader: Reader) {
            yield* p1.proceed(reader);
            yield* p2.proceed(reader);
            return;
        });
    }
    public seq2<B>(p2: Parser<B>): Parser<[A, B]> {
        const p1 = this;
        return p1.bind((x) => p2.bind((y) => succ([x, y])));
    }
    public map<Y>(f: (x: A) => Y): Parser<Y> {
        return this.bind((x) => succ(f(x)));
    }
    public intoStr(
        sep: string = '',
    ): Parser<A extends string[] ? string : never> {
        return this.map((xs) => {
            if (Array.isArray(xs)) {
                return xs.join(sep) as A extends string[] ? string : never;
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
    public named<K extends PropertyKey>(k: K): Parser<{ [P in K]: A }> {
        return this.map((v) => ({ [k]: v }) as Record<K, A>);
    }
    public ignored<K extends PropertyKey>(): Parser<{}> {
        return this.map((v) => ({}));
    }
    public intoObj(): Parser<A extends any[] ? Intersection<A> : never> {
        return this.map((xs) => {
            if (Array.isArray(xs)) {
                return Object.assign({}, ...xs) as A extends any[]
                    ? Intersection<A>
                    : never;
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
    public takeM(): Parser<TakeM<A>> {
        return this.map((xs) => {
            if (Array.isArray(xs) && xs.length === 3) {
                return xs[1];
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
    public dropFL(): Parser<DropFL<A>> {
        return this.map((xs) => {
            if (Array.isArray(xs) && xs.length >= 2) {
                return xs.slice(1, xs.length - 1) as DropFL<A>;
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
}

export const rec = <T>(lazyP: () => Parser<T>): Parser<T> =>
    new Parser((x: Reader) => lazyP().proceed(x));

function withReader<T>(f: (_: Reader) => ResultSet<T>): Parser<T> {
    return new Parser(function* (reader: Reader) {
        yield* f(reader);
    });
}

export const once = <T>(p: Parser<T>): Parser<T> =>
    withReader((reader) => p.proceed(reader).take(1));
export const succ = <T>(value: T) =>
    withReader((reader) => [{ reader, value }].values());
export const fail: Parser<never> = withReader((_) => [].values());
export const eof = <T>(value: T) =>
    withReader((reader) =>
        (reader.atEnd() ? [{ reader, value }] : []).values(),
    );
export const strN = (n: number = 1) => withReader((reader) => reader.read(n));
export const strWhile = (p: (x: string) => boolean = (_) => true) =>
    withReader((reader) => reader.readWhile(p));

export function filter<T>(p: Parser<T>, f: (_: T) => boolean): Parser<T> {
    return p.bind((x) => (f(x) ? succ(x) : fail));
}
