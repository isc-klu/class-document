import type { Node, NSeq, NAlt } from './EBNF.js';

function makeSeq(n1: Node, n2: Node): Node {
    const content = [
        ...(typeof n1 === 'object' && n1.kind === 'seq' ? n1.content : [n1]),
        ...(typeof n2 === 'object' && n2.kind === 'seq' ? n2.content : [n2]),
    ];
    if (content.length === 1) {
        return content[0]!;
    }
    return {
        kind: 'seq',
        content,
    };
}

function makeAlt(n1: Node, n2: Node): Node {
    const content = [
        ...(typeof n1 === 'object' && n1.kind === 'alt' ? n1.content : [n1]),
        ...(typeof n2 === 'object' && n2.kind === 'alt' ? n2.content : [n2]),
    ];
    if (content.length === 1) {
        return content[0]!;
    }
    return {
        kind: 'alt',
        content,
    };
}

export interface Result<T> {}

export type ResultSet<T> = null;

type DropF<T> = T extends [infer _, ...infer R] ? R : never;
type DropL<T> = T extends [...infer R, infer _] ? R : never;
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
    description?: string;
    private trivial: boolean;
    constructor(public toNode: (shared: Map<string, Node>) => Node) {
        this.trivial = false;
        const that = this;
        this.toNode = (shared) => {
            if (that.trivial) {
                return { kind: 'seq', content: [] };
            }
            if (that.description != undefined) {
                if (!shared.has(that.description)) {
                    shared.set(that.description, toNode(shared));
                }
                return {
                    kind: 'ref',
                    content: that.description,
                };
            }
            return toNode(shared);
        };
    }
    public describe(s: string): Parser<A> {
        this.description = s;
        return this;
    }
    public markTrivial(): Parser<A> {
        this.trivial = true;
        return this;
    }
    public exec(source: string, n: number = 1) {
        throw new Error('This is a printer!');
    }
    public alt2<B>(p2: Parser<B>): Parser<A | B> {
        const p1 = this;
        return new Parser((shared) => {
            try {
                const n1 = p1.toNode(shared);
                try {
                    const n2 = p2.toNode(shared);
                    return makeAlt(n1, n2);
                } catch {
                    return n1;
                }
            } catch {
                return p2.toNode(shared);
            }
        });
    }
    public seq2<B>(p2: Parser<B>): Parser<[A, B]> {
        const p1 = this;
        return new Parser((shared) =>
            makeSeq(p1.toNode(shared), p2.toNode(shared)),
        );
    }
    public map<Y>(_: (x: A) => Y): Parser<Y> {
        return this as Parser<any>;
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
    public ignored(): Parser<{}> {
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
    public dropF(): Parser<DropF<A>> {
        return this.map((xs) => {
            if (Array.isArray(xs) && xs.length >= 2) {
                return xs.slice(1) as DropF<A>;
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
    public dropL(): Parser<DropL<A>> {
        return this.map((xs) => {
            if (Array.isArray(xs) && xs.length >= 2) {
                return xs.slice(0, xs.length - 1) as DropL<A>;
            } else {
                throw new Error('The input is not an array');
            }
        });
    }
    public dbg(where: string = 'DBG'): Parser<A> {
        return this.map((x) => {
            console.log(`${where}: `, JSON.stringify(x));
            return x;
        });
    }
}

export const rec = <T>(lazyP: () => Parser<T>): Parser<T> => {
    return new Parser((shared): Node => {
        const p = lazyP();
        p.description =
            p.description ?? 'node' + Math.random().toString().slice(2, 7);
        return p.toNode(shared);
    });
};

export const once = <T>(p: Parser<T>): Parser<T> => p;
export const succ = <T>(_?: any): Parser<T> =>
    new Parser((shared) => ({ kind: 'seq', content: [] }));
export const fail: Parser<never> = new Parser((shared) => {
    throw Error('Deadend!');
});
export const eof = <T>(value: T): Parser<T> => succ();
export const strWhile = (
    p: (x: string) => boolean = (_) => true,
): Parser<string> =>
    new Parser((shared) => ({
        kind: 'pat',
        content: '.* and ' + p.toString(),
    }));

export function filter<T>(p: Parser<T>, f: (_: T) => boolean): Parser<T> {
    return new Parser((shared) => {
        const n = p.toNode(shared);
        n.annotations = n.annotations ?? [];
        n.annotations.push(f.toString());
        return n;
    });
}

export function strIf(
    n: number,
    p: (x: string) => boolean = (_) => true,
): Parser<string> {
    return new Parser((shared) => ({
        kind: 'pat',
        content: `.${n} and ` + p.toString(),
    }));
}

export const repeat1 = <T>(x: Parser<T>): Parser<T[]> =>
    new Parser((shared) => ({
        kind: 'rep1',
        content: x.toNode(shared),
    }));

export const repeat = <T>(x: Parser<T>): Parser<T[]> =>
    new Parser((shared) => ({
        kind: 'rep',
        content: x.toNode(shared),
    }));

export function str<T extends string>(x: T): Parser<T> {
    return new Parser((shared) => ({
        kind: 'str',
        content: x,
    }));
}

export function StR<T extends string>(x: T): Parser<string> {
    return new Parser((shared) => ({
        kind: 'str',
        caseInsensitive: true,
        content: x,
    }));
}
