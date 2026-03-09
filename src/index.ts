import { read } from "node:fs";

export class Dependency {
    keyword: string;
    space: string;
    content: string;
    constructor(keyword: string, space: string, content: string) {
        this.keyword = keyword;
        this.space = space;
        this.content = content;
    }

    toString(): string {
        return `${this.keyword}${this.space}${this.content}`
    }
}

export class Extends {
    keyword: string
    gap: string
    parents: string | string[]

    constructor(keyword: string, gap: string, parents: string | string[]) {
        this.keyword = keyword
        this.gap = gap
        this.parents = parents
    }

    public toString(): string {
        return this.keyword + this.gap + (typeof this.parents === "string" ? this.parents : '(' + this.parents.join(',') + ')')
    }
}

interface Location {
    line: number;
    char: number;
    absolute: number;
}

class Reader {
    source: string;
    private pos: Location;
    constructor(source: string) {
        this.source = source;
        this.pos = {
            line: 0,
            char: 0,
            absolute: 0,
        }
    }
    public peak(n: number = 1) {
        return this.source.slice(this.pos.absolute, this.pos.absolute + n);
    }
    public location(): Location {
        return Object.assign({}, this.pos);
    }
    public advance(n: number = 1) {
        for (; n > 0; n--) {
            if (this.peak() === "\n") {
                this.pos.line += 1;
                this.pos.char = 0;
            } else {
                this.pos.char += 1;
            }
            this.pos.absolute += 1;
        }
    }
    public i() {
        return this.pos.absolute;
    }
    public expecting(concept: string): Error {
        return new Error(`Expecting ${concept} at ` + JSON.stringify(this.pos) + ', found "' + this.source.slice(this.i(), this.i() + 20) + '..."')
    }
}

export class Description {
    comment: string[]

    constructor(comment: string[]) {
        this.comment = comment;
    }

    public toString(): string {
        return this.comment.map((line) => `///${line}\n`).join('')
    }
}

export class Document {
    dependencies: (Dependency | string)[]
    description: Description;
    keyword: string;
    gapKeywordName: string;
    name: string;
    gapNameExtends: string;
    extends: null | Extends
    gapExtendsKeywords: string;
    keywords: null | string[];
    gapKeywordsBegin: string;
    content: string;
    constructor(source: string) {
        const reader = new Reader(source);
        this.dependencies = parseDependencies(reader);
        this.description = parseDescription(reader);
        this.keyword = parseClassKeyword(reader);
        this.gapKeywordName = parseProperGap(reader);
        this.name = parseName(reader);
        this.gapNameExtends = parseProperGap(reader);
        this.extends = parseExtends(reader);
        this.gapExtendsKeywords = parseWhitespace(reader);
        this.keywords = parseBracketList(reader);
        this.gapKeywordsBegin = parseWhitespace(reader);
        parseBegin(reader);
        this.content = reader.source.slice(reader.i());
    }

    public toString(): string {
        return this.dependencies.map((x) => x.toString()).join("") +
            this.description.toString() +
            this.keyword + this.gapKeywordName +
            this.name + this.gapNameExtends +
            (this.extends === null ? "" : this.extends.toString()) + this.gapExtendsKeywords +
            (this.keywords === null ? "" : '[' + this.keywords.join(',') + ']') + this.gapKeywordsBegin +
            "{" +
            this.content;
    }
}

function parseExtendsKeyword(reader: Reader): null | string {
    const regex = /Extends/yi;
    regex.lastIndex = reader.i();
    const maybeMatch = regex.exec(reader.source);
    if (maybeMatch === null) {
        return null
    }
    const [full] = maybeMatch
    reader.advance(full.length);
    return full;
}

function parseBracketList(reader: Reader): null | string[] {
    if (reader.peak() === "[") {
        parsePrefix("[", reader)
        const regex = /[^\]]*/y;
        regex.lastIndex = reader.i();
        const [full] = regex.exec(reader.source) as [string];
        const list = full.split(",")
        reader.advance(full.length)
        parsePrefix("]", reader)
        return list
    } else {
        return null
    }
}

function parseList(reader: Reader): string[] {
    const regex = /[^)]*/y;
    regex.lastIndex = reader.i();
    const [full] = regex.exec(reader.source) as [string];
    reader.advance(full.length)
    return full.split(",")
}

function parseExtends(reader: Reader): null | Extends {
    const keyword = parseExtendsKeyword(reader)
    if (keyword === null) {
        return null
    }
    const pad = parseWhitespace(reader)
    if (reader.peak() === "(") {
        parsePrefix("(", reader);
        const parents = parseList(reader)
        parsePrefix(")", reader);
        return new Extends(keyword, pad, parents)
    } else {
        const parent = parseName(reader)
        return new Extends(keyword, pad, parent)
    }
}

function parsePrefix(prefix: string, reader: Reader): void {
    if (reader.peak(prefix.length) !== prefix) {
        throw reader.expecting(prefix)
    }
    reader.advance(prefix.length)
}


function parseBegin(reader: Reader): void {
    return parsePrefix("{", reader)
}

function parseDescription(reader: Reader): Description {
    const regex = /(\/\/\/[^\n]*\n)*/yi;
    regex.lastIndex = reader.i();
    const maybeMatch = regex.exec(reader.source) as [string];
    const [full] = maybeMatch
    reader.advance(full.length);
    const lines = full.split('\n')
    console.assert(lines.pop() === "", "The last description line must be empty because we matched \\n-ending lines.")
    return new Description(lines.map((line) => line.slice(3,)))
}

function parseName(reader: Reader): string {
    const regex = /[^\s]+/yi;
    regex.lastIndex = reader.i();
    const maybeMatch = regex.exec(reader.source);
    if (maybeMatch === null) {
        throw new Error(`Can't find a name at ` + JSON.stringify(reader.location()))
    }
    const [full] = maybeMatch
    reader.advance(full.length);
    return full;
}

function parseClassKeyword(reader: Reader): string {
    const regex = /class/yi;
    regex.lastIndex = reader.i();
    const maybeMatch = regex.exec(reader.source);
    if (maybeMatch === null) {
        throw new Error(`Can't find class keyword at ` + JSON.stringify(reader.location()))
    }
    const [full] = maybeMatch
    reader.advance(full.length);
    return full;
}


function parseProperGap(reader: Reader): string {
    const regex = /\s+/y;
    regex.lastIndex = reader.i();
    const execResult = regex.exec(reader.source);
    if (execResult === null) {
        throw reader.expecting("a proper gap")
    }
    const [full] = execResult;
    reader.advance(full.length);
    return full;
}

function parseWhitespace(reader: Reader): string {
    const regex = /\s*/y;
    regex.lastIndex = reader.i();
    const [content] = regex.exec(reader.source) as [string];
    reader.advance(content.length);
    return content;
}

function parseDependency(reader: Reader): Dependency | null {
    const regex = /(import|include|includegenerator)(\s+)([^\n]+)/yi;
    regex.lastIndex = reader.i();
    const result = regex.exec(reader.source);
    if (result === null) {
        return result;
    } else {
        const [match, keyword, space, content] = result;
        reader.advance(match.length);
        return new Dependency(keyword as string, space as string, content as string)
    }
}

function parseDependencies(reader: Reader): (Dependency | string)[] {
    const output: (Dependency | string)[] = [];
    while (true) {
        output.push(parseWhitespace(reader))
        const maybeDep = parseDependency(reader);
        if (maybeDep === null) {
            break;
        }
        output.push(maybeDep)
    }
    return output;
}