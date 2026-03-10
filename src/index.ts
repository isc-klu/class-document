import { AlPhA, alt2, altN, butNL, char, chars, cons, isChar, isSpace, join, literal, LiTeRaL, map, oneOrMore, Reader, sepList, seq2, seq3, seq4, seq5, seq6, seq7, seq9, seqN, space, succ, take1, zeroOrMore, type Parser } from "./langspec.js";

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
    gapBefore: string
    keyword: string
    gapKeywordParents: string
    parents: string | string[]

    constructor(gapBefore: string, keyword: string, gap: string, parents: string | string[]) {
        this.gapBefore = gapBefore
        this.keyword = keyword
        this.gapKeywordParents = gap
        this.parents = parents
    }

    public toString(): string {
        return this.gapBefore + this.keyword + this.gapKeywordParents + (typeof this.parents === "string" ? this.parents : '(' + this.parents.join(',') + ')')
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

export abstract class Member {
    keyword: string;
    gapKeywordName: string;
    name: string;
    gapNameContent: string;
    constructor(keyword: string, gapKeywordName: string, name: string, gapNameContent: string) {
        this.keyword = keyword;
        this.gapKeywordName = gapKeywordName;
        this.name = name;
        this.gapNameContent = gapNameContent;
    }

    abstract toString(): string
}

export class PropertyLikeMember extends Member{
    content: string;
    constructor(keyword: string, gapKeywordName: string, name: string, gapNameContent: string, content: string) {
        super(keyword, gapKeywordName, name, gapNameContent);
        this.content = content;
    }

    toString(): string {
        return `${this.keyword}${this.gapKeywordName}${this.name}${this.gapNameContent}${this.content}`
    }
}

export class XDataLikeMember extends Member{
    keywords: null | string[];
    gapKeywordsBegin: string;
    content: string;
    constructor(keyword: string, gapKeywordName: string, name: string, gapNameContent: string, keywords: null | string[], gapKeywordsBegin: string, content: string) {
        super(keyword, gapKeywordName, name, gapNameContent);
        this.keywords = keywords;
        this.gapKeywordsBegin = gapKeywordsBegin;
        this.content = content;
    }

    toString(): string {
        return (
            this.keyword +
            this.gapKeywordName +
            this.name +
            this.gapNameContent +
            (this.keywords === null ? "" : '[' + this.keywords.map((keyword) => keyword.toString()).join(',') + ']') +
            this.gapKeywordsBegin + "{" +
            this.content + "\n}"
        )
    }
}

export class Document {
    gapBeforeDeps: string;
    dependencies: (Dependency | string)[]
    gapDepsDesc: string;
    description: Description;
    gapDescKeyword: string;
    keyword: string;
    gapKeywordName: string;
    name: string;
    extends: null | Extends
    // keywords: null | string[];
    // gapKeywordsBegin: string;
    // members: (Member | string)[];
    content: string;
    
    constructor(
        gapBeforeDeps: string,
        dependencies: (Dependency | string)[],
        gapDepsDesc: string,
        description: Description,
        gapDescKeyword: string,
        keyword: string,
        gapKeywordName: string,
        name: string,
        ext: null | Extends,
        // keywords: null | string[],
        // gapKeywordsBegin: string,
        // members: (Member | string)[],
        content: string
    ) {
        this.gapBeforeDeps = gapBeforeDeps;
        this.dependencies = dependencies;
        this.gapDepsDesc = gapDepsDesc;
        this.description = description;
        this.gapDescKeyword = gapDescKeyword;
        this.keyword = keyword;
        this.gapKeywordName = gapKeywordName;
        this.name = name;
        this.extends = ext;
        // this.gapExtendsKeywords = gapExtendsKeywords;
        // this.keywords = keywords;
        // this.gapKeywordsBegin = gapKeywordsBegin;
        // this.members = members;
        this.content = content;
    }

    public toString(): string {
        // console.log("The dependencies are:", JSON.stringify(this.dependencies))
        return (
            this.gapBeforeDeps +
            this.dependencies.map((x) => x.toString()).join("") +
            this.gapDepsDesc +
            this.description.toString() +
            this.gapDescKeyword +
            this.keyword + 
            this.gapKeywordName +
            this.name + 
            (this.extends === null ? "" : this.extends.toString()) +
            // this.gapExtendsKeywords +
            // (this.keywords === null ? "" : '[' + this.keywords.join(',') + ']') + this.gapKeywordsBegin +
            // "{" +
            // this.members.map((x) => x.toString()).join("") +
            // "aftermembers" + 
            this.content);
    }
}

const maybeGap = map(zeroOrMore(space), join);
const strictGap = map(oneOrMore(space), join);
const dependency = map(
    seq3(
        altN(LiTeRaL("import"), LiTeRaL("include"), LiTeRaL("includegenerator")),
        strictGap,
        map(oneOrMore(butNL), join),
    ),
    (parts) => new Dependency(...parts)
);
const dependencies = zeroOrMore(dependency);
const descriptionLine = map(
    seq3(literal("///"), map(oneOrMore(butNL), join),
    literal("\n")), ([_slashes, comment, _nl]) => comment
);
const description = map(
    zeroOrMore(descriptionLine),
    (parts) => new Description(parts),
)

const name = map(oneOrMore(altN(AlPhA, literal("%"), literal("."))), join);

const parentList = map(
    seq3(
        literal("("),
        map(
            sepList(map(seqN(maybeGap, name, maybeGap), join), literal(",")),
            ([parents, _gaps]) => parents
        ),
        literal(")"),
    ),
    ([_1, parents, _2]) => parents
)

const ext = map(
    seq4(
        strictGap,
        LiTeRaL("extends"),
        strictGap,
        alt2(name, parentList),
    ),
    (parts) => new Extends(...parts)
)

const document = map(
    seq6(
        // before the class keyword
        seq5(
            maybeGap,
            dependencies,
            maybeGap,
            description,
            maybeGap,
        ),
        // before "{"
        LiTeRaL("class"),
        strictGap,
        name,
        alt2(ext, succ(null)),
        chars(isChar),
    ),
    ([beforeClass, ...parts]) => {
        return new Document(
            ...beforeClass,
            ...parts
        )
    }
)

export const parseDocument = (input: string): Document => {
    const reader = new Reader(input);
    const doc = take1(document(reader))
    if (doc === null) {
        throw new Error(`Can't parse document`);
    } else {
        return doc.value;
    }
}