import { fail, succ } from "./core.js";
import { type Parser } from "./core.js";

export function alt<T1, T2>(p1: Parser<T1>, p2: Parser<T2>): Parser<T1 | T2>;
export function alt<T>(...ps: Parser<T>[]): Parser<T>;
export function alt<T>(...ps: Parser<T>[]): Parser<T> {
  return ps.reduceRight((acc, p) => p.alt2(acc), fail);
}
export function optional<A, B = null>(p: Parser<A>, x?: B): Parser<A | B>;
export function optional(p: Parser<any>, x: any = null): Parser<any> {
  return p.alt2(succ(x));
}
