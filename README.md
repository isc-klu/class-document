# Class Document

This repo aims at achieving three goals:

* a pure TypeScript library for parsing IRIS Class Documents (i.e., `*.cls`)
* an EBNF format of the class language
* a generator of class documents 

## Correctness

As of 2026-03-10, the parser correctly accepts all wellformed documents on [the tree-sitter-objectscript benchmark](https://github.com/intersystems/tree-sitter-objectscript/tree/main/udl/test/corpus). However, it does not reject all malformed documents.
