# Class Document

This repository aims to achieve three goals:

* Provide a pure TypeScript parser for IRIS Class Documents (i.e., *.cls files).
* Define an EBNF-like specification for the class language in ./src/index.ts.
* Provide a generator for IRIS Class Documents.

## Correctness

As of 2026‑03‑10, the parser successfully accepts all well‑formed documents in the
https://github.com/intersystems/tree-sitter-objectscript/tree/main/udl/test/corpus.
However, it does not yet reject all malformed documents, so full correctness is still a work in progress.

## How to Read the EBNF Format

Consider the definition for method-like class members:

```typescript
const mMethodLike = seq(
    alt(StR('trigger'), StR('method'), StR('classmethod'), StR('query')),
    gap1,
    name,
    gap,
    argList,
    optional(asType),
    optional(methodAnnKeywords),
    gap,
    methodBody,
).map((parts) => {
    return new MethodLikeMember(...parts);
});
```
* seq defines a sequence of elements.
* alt defines an alternative. Here, the first element must be one of: trigger, method, classmethod, or query.
* StR specifies a case‑insensitive string literal. (In contrast, str—not shown here—is case‑sensitive.)
* gap1 represents a non‑empty gap of whitespace or comments, and gap represents a possibly empty gap.
* optional(...) means the element may or may not appear.
* The .map call transforms the raw parse output into an instance of MethodLikeMember. You can think of it as a post‑processing step.

To illustrate a few more key concepts, consider the argList definition and related rules:

```typescript
const annArgMode = alt(
    seqJoin(StR('Output'), gap1),
    seqJoin(StR('ByRef'), gap1),
);
const annArgDefault = seqJoin(gap, str('='), gap, value);
const arg = seqJoin(
    optional(annArgMode),
    name,
    optional(annType),
    optional(annArgDefault),
);
const argWithPad = seq(gap, arg, gap);
const args = once(repeatSepWithStr(argWithPad, ','));
const argList = seqDrop13('(', args, ')');
```

* argList is a sequence consisting of '(', args, and ')'.
* seqDrop13 works like seq, but drops the first and third elements (in this case the parentheses) from the parsed result.
* args is a repeat‑with‑separator structure: repeatSepWithStr(argWithPad, ',') parses zero or more arguments separated by commas.
* once ensures the parser tries the element at most once; this is primarily an optimization.

Below is a summary of common combinators used in the grammar:

* repeat(x) — zero or more occurrences of x
* repeat1(x) — one or more occurrences of x
* repeatSep(x, y) — zero or more occurrences of x separated by y
* repeatSepWithStr(x, s) — zero or more occurrences of x separated by string s
* seq(x ...) — sequence of elements x ...
* seqJoin(x ...) — sequence of elements x ..., each producing a string; results are concatenated
* seqDrop13(s, x, t) — sequence of literal s, then x, then literal t; result drops s and t

## Next Step

My ultimate objective is to maintain one unified definition that can be executed as a parser, used to generate random ObjectScript code, and also print a clean, human‑readable EBNF grammar.