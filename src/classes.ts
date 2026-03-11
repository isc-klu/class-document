export class Dependency {
    constructor(
        protected readonly keyword: string,
        protected readonly space: string,
        protected readonly content: string,
    ) {}

    toString(): string {
        return this.keyword + this.space + this.content;
    }
}

export class Extends {
    constructor(
        protected readonly gapBefore: string,
        protected readonly keyword: string,
        protected readonly gapKeywordParents: string,
        protected readonly parents: string | [string, string, string][],
    ) {}

    public toString(): string {
        return (
            this.gapBefore +
            this.keyword +
            this.gapKeywordParents +
            (typeof this.parents === 'string'
                ? this.parents
                : '(' + this.parents.map((p) => p.join('')).join(',') + ')')
        );
    }
}

export class AnnKeywordList {
    constructor(
        protected readonly gapBefore: string,
        protected readonly keywords: [string, string, string][] | string,
    ) {}

    public toString(): string {
        return (
            this.gapBefore +
            '[' +
            (typeof this.keywords === 'string'
                ? this.keywords
                : this.keywords.map(([s1, k, s2]) => s1 + k + s2).join(',')) +
            ']'
        );
    }
}

export class Description {
    constructor(protected readonly lines: string[]) {}

    public toString(): string {
        return this.lines.join('');
    }
}

export abstract class Member {
    description!: Description;
    gapDescriptionKeyword!: string;
    constructor(
        protected readonly keyword: string,
        protected readonly gapKeywordName: string,
        protected readonly name: string,
        protected readonly gapNameEnd: string,
    ) {
        this.keyword = keyword;
        this.gapKeywordName = gapKeywordName;
        this.name = name;
        this.gapNameEnd = gapNameEnd;
    }

    setDescription(description: Description, gapDescriptionKeyword: string) {
        this.description = description;
        this.gapDescriptionKeyword = gapDescriptionKeyword;
    }

    addDescription(text: string): string {
        return this.description.toString() + this.gapDescriptionKeyword + text;
    }
}

export class AnnType {
    constructor(
        protected keyword: string,
        protected type: string,
    ) {}

    toString() {
        return this.keyword + this.type;
    }
}

export class AnnValue {
    constructor(
        protected readonly keyword: string,
        protected readonly type: string,
    ) {}

    toString() {
        return this.keyword + this.type;
    }
}

export class MParameter extends Member {
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        protected readonly annType: string | null,
        protected readonly keywords: AnnKeywordList | null,
        protected readonly annValue: AnnValue | null,
        gapNameEnd: string,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                (this.annType ?? '') +
                (this.keywords?.toString() ?? '') +
                (this.annValue?.toString() ?? '') +
                this.gapNameEnd +
                ';',
        );
    }
}

export class MPropertyOrProjection extends Member {
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        protected readonly annClassName: string | null,
        protected readonly keywordList: AnnKeywordList | null,
        gapNameEnd: string,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                (this.annClassName ?? '') +
                (this.keywordList?.toString() ?? '') +
                this.gapNameEnd +
                ';',
        );
    }
}

export class MIndex extends Member {
    content: string;
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        content: string,
    ) {
        super(keyword, gapKeywordName, name, '');
        this.content = content;
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                this.gapNameEnd +
                this.content +
                ';',
        );
    }
}

export class MForeignKey extends Member {
    ids: [string, string, string][];
    referencedClass: string;
    refIndex: string | null;
    keywordList: AnnKeywordList | null;
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        ids: [string, string, string][],
        gapNameEnd: string,
        referencedClass: string,
        refIndex: string | null,
        keywordList: AnnKeywordList | null,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
        this.ids = ids;
        this.referencedClass = referencedClass;
        this.refIndex = refIndex;
        this.keywordList = keywordList;
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                '(' +
                this.ids.map(([s1, x, s2]) => s1 + x + s2).join(',') +
                ')' +
                this.gapNameEnd +
                this.referencedClass +
                (this.refIndex === null ? '' : '(' + this.refIndex + ')') +
                (this.keywordList === null ? '' : this.keywordList.toString()) +
                ';',
        );
    }
}

export class MXDataOrStorage extends Member {
    keywords: null | AnnKeywordList;
    content: string;
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        keywords: null | AnnKeywordList,
        gapNameEnd: string,
        content: string,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
        this.keywords = keywords;
        this.content = content;
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                (this.keywords === null ? '' : this.keywords.toString()) +
                this.gapNameEnd +
                '{' +
                this.content +
                '}',
        );
    }
}

export class MTrigger extends Member {
    keywords: null | AnnKeywordList;
    content: string;
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        keywords: null | AnnKeywordList,
        gapNameEnd: string,
        content: string,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
        this.keywords = keywords;
        this.content = content;
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                (this.keywords === null ? '' : this.keywords.toString()) +
                this.gapNameEnd +
                '{' +
                this.content +
                '}',
        );
    }
}

export class MethodLikeMember extends Member {
    keywords: null | AnnKeywordList;
    content: string;
    gapNameParen: string;
    parameters: [string, string, string][];
    typeAnn: string | null;
    constructor(
        keyword: string,
        gapKeywordName: string,
        name: string,
        gapNameParen: string,
        parameters: [string, string, string][],
        typeAnn: string | null,
        keywords: null | AnnKeywordList,
        gapNameEnd: string,
        content: string,
    ) {
        super(keyword, gapKeywordName, name, gapNameEnd);
        this.keywords = keywords;
        this.gapNameParen = gapNameParen;
        this.parameters = parameters;
        this.typeAnn = typeAnn;
        this.content = content;
    }

    toString(): string {
        return this.addDescription(
            this.keyword +
                this.gapKeywordName +
                this.name +
                this.gapNameParen +
                '(' +
                this.parameters.map(([s1, x, s2]) => s1 + x + s2).join(',') +
                ')' +
                (this.typeAnn ?? '') +
                (this.keywords === null ? '' : this.keywords.toString()) +
                this.gapNameEnd +
                '{' +
                this.content +
                '}',
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
    keywords: null | AnnKeywordList;
    gapKeywordsBegin: string;
    members: [string[], Member[]];
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
        keywords: null | AnnKeywordList,
        gapKeywordsBegin: string,
        members: [string[], Member[]],
        gapAfterClass: string,
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
            this.dependencies.map((x) => x.toString()).join('') +
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
            this.members[0]
                .map((x, i) => (this.members[1][i - 1]?.toString() ?? '') + x)
                .join('') +
            '}' +
            this.gapAfterClass
        );
    }
}
