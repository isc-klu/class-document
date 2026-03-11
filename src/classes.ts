
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
        return `${this.keyword}${this.space}${this.content}`;
    }
}

export class Extends {
    gapBefore: string;
    keyword: string;
    gapKeywordParents: string;
    parents: string | string[];

    constructor(gapBefore: string, keyword: string, gap: string, parents: string | string[]) {
        this.gapBefore = gapBefore;
        this.keyword = keyword;
        this.gapKeywordParents = gap;
        this.parents = parents;
    }

    public toString(): string {
        return this.gapBefore + this.keyword + this.gapKeywordParents + (typeof this.parents === "string" ? this.parents : '(' + this.parents.join(',') + ')');
    }
}

export class Keywords {
    gapBefore: string;
    keywords: string[];

    constructor(gapBefore: string, keywords: string[]) {
        this.gapBefore = gapBefore;
        this.keywords = keywords;
    }

    public toString(): string {
        return (
            this.gapBefore +
            '[' +
            this.keywords.join(',') +
            ']'
        );
    }
}

export class Description {
    lines: string[];

    constructor(lines: string[]) {
        this.lines = lines;
    }

    public toString(): string {
        return this.lines.join('');
    }
}

export abstract class Member {
    description: Description;
    gapDescKeyword: string;
    keyword: string;
    gapKeywordName: string;
    name: string;
    gapNameContent: string;
    constructor(description: Description, gapDescKeyword: string, keyword: string, gapKeywordName: string, name: string, gapNameContent: string) {
        this.description = description;
        this.gapDescKeyword = gapDescKeyword;
        this.keyword = keyword;
        this.gapKeywordName = gapKeywordName;
        this.name = name;
        this.gapNameContent = gapNameContent;
    }

    abstract toString(): string;
}

export class PropertyLikeMember extends Member {
    content: string;
    constructor(description: Description, gapDescriptionKeyword: string, keyword: string, gapKeywordName: string, name: string, content: string) {
        super(description, gapDescriptionKeyword, keyword, gapKeywordName, name, "");
        this.content = content;
    }

    toString(): string {
        return (
            this.description.toString() + 
            this.gapDescKeyword +
            `${this.keyword}${this.gapKeywordName}${this.name}${this.gapNameContent}${this.content};`
        );
    }
}

export class ForeignKeyLikeMember extends Member {
    ids: [string[], string[]];
    content: string;
    constructor(description: Description, gapDescKeyword: string, keyword: string, gapKeywordName: string, name: string, ids: [string[], string[]], gapNameContent: string, content: string) {
        super(description, gapDescKeyword, keyword, gapKeywordName, name, gapNameContent);
        this.ids = ids;
        this.content = content;
    }

    toString(): string {
        return (
            this.description.toString() +
            this.gapDescKeyword +
            this.keyword +
            this.gapKeywordName +
            this.name +
            '(' +
            this.ids[0].map((id, i) => (this.ids[1][i - 1] ?? "") + id).join("") +
            ')' +
            this.gapNameContent +
            this.content +
            ';'
        );
    }
}

export class XDataLikeMember extends Member {
    keywords: null | Keywords;
    content: string;
    constructor(
        description: Description,
        gapDescKeyword: string,
        keyword: string,
        gapKeywordName: string,
        name: string,
        keywords: null | Keywords,
        gapNameContent: string,
        content: string
    ) {
        super(description, gapDescKeyword, keyword, gapKeywordName, name, gapNameContent);
        this.keywords = keywords;
        this.content = content;
    }

    toString(): string {
        return (
            this.description.toString() +
            this.gapDescKeyword +
            this.keyword +
            this.gapKeywordName +
            this.name +
            (this.keywords === null ? "" : this.keywords.toString()) +
            this.gapNameContent +
            "{" +
            this.content +
            "}"
        );
    }
}

export class TriggerLikeMember extends Member {
    keywords: null | Keywords;
    content: string;
    constructor(
        description: Description,
        gapDescKeyword: string,
        keyword: string,
        gapKeywordName: string,
        name: string,
        keywords: null | Keywords,
        gapNameContent: string,
        content: string
    ) {
        super(description, gapDescKeyword, keyword, gapKeywordName, name, gapNameContent);
        this.keywords = keywords;
        this.content = content;
    }

    toString(): string {
        return (
            this.description.toString() +
            this.gapDescKeyword +
            this.keyword +
            this.gapKeywordName +
            this.name +
            (this.keywords === null ? "" : this.keywords.toString()) +
            this.gapNameContent +
            "{" +
            this.content +
            "}"
        );
    }
}

export class MethodLikeMember extends Member {
    keywords: null | Keywords;
    content: string;
    gapNameParen: string;
    gapParenParams: string;
    parameters: [string[], string[]];
    gapParamsParen: string;
    typeAnn: string;
    constructor(
        description: Description,
        gapDescKeyword: string,
        keyword: string,
        gapKeywordName: string,
        name: string,
        gapNameParen: string,
        [gapParenParams, parameters, gapParamsParen]: [string,
            [string[], string[]],
            string],
        typeAnn: string,
        keywords: null | Keywords,
        gapNameContent: string,
        content: string
    ) {
        super(description, gapDescKeyword, keyword, gapKeywordName, name, gapNameContent);
        this.keywords = keywords;
        this.gapNameParen = gapNameParen;
        this.gapParenParams = gapParenParams;
        this.parameters = parameters;
        this.gapParamsParen = gapParamsParen;
        this.typeAnn = typeAnn;
        this.content = content;
    }

    toString(): string {
        return (
            this.description.toString() +
            this.gapDescKeyword +
            this.keyword +
            this.gapKeywordName +
            this.name +
            this.gapNameParen +
            '(' +
            this.gapParenParams +
            this.parameters[0].map((p, i) => (this.parameters[1][i - 1] ?? "") + p).join("") +
            this.gapParamsParen +
            ')' +
            this.typeAnn +
            (this.keywords === null ? "" : this.keywords.toString()) +
            this.gapNameContent +
            "{" +
            this.content +
            "}"
        );
    }
}

export class Document {
    gapBeforeDeps: string;
    dependencies: (Dependency | string)[];
    gapDepsDesc: string;
    description: Description;
    gapDescKeyword: string;
    keyword: string;
    gapKeywordName: string;
    name: string;
    extends: null | Extends;
    keywords: null | Keywords;
    gapKeywordsBegin: string;
    members: [string[], (string | Member)[]];
    gapAfterClass: string;

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
        keywords: null | Keywords,
        gapKeywordsBegin: string,
        members: [string[], (string | Member)[]],
        gapAfterClass: string
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
        this.keywords = keywords;
        this.gapKeywordsBegin = gapKeywordsBegin;
        this.members = members;
        this.gapAfterClass = gapAfterClass;
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
            (this.extends === null ? '' : this.extends.toString()) +
            (this.keywords === null ? '' : this.keywords.toString()) +
            this.gapKeywordsBegin +
            '{' +
            this.members[0].map((x, i) => (this.members[1][i - 1]?.toString() ?? "") + x).join("") +
            '}' +
            this.gapAfterClass
        );
    }
}
