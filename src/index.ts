import {
    AnnValue,
    Dependency,
    Description,
    Document,
    Extends,
    MForeignKey,
    AnnKeywordList,
    Member,
    MethodLikeMember,
    MParameter,
    MIndex,
    MTrigger,
    MXDataOrStorage,
    MPropertyOrProjection,
} from './classes.js';
import {
    strIf,
    join,
    isButNL,
    isNumeral,
    isSpace,
    isSpaceButNL,
    str,
    StR,
    strWhile1,
    repeat,
    repeat1,
    repeatSep,
    seqJoin,
    seqDrop13,
    seqDrop2,
    repeatSepWithStr,
} from './langspec/index.js';
import { filter } from './langspec/core.js';
import { strWhile, eof } from './langspec/core.js';
import { once, type Parser } from './langspec/core.js';
import {
    balanced,
    balancedElement,
    simpleString,
    word,
} from './langspec/pl.js';
import { alt, optional } from './langspec/alt.js';
import { seq } from './langspec/seq.js';

// Range Comment
const rCommentStart = str('/*');
const rCommentContentElem = alt(
    once(strWhile1((c) => c !== '*')),
    strIf(2, (s) => s != '*/'),
);
const rCommentContent = join(repeat(rCommentContentElem));
const rCommentEnd = str('*/');
const rComment = join(seq(rCommentStart, rCommentContent, rCommentEnd));

// Line Comment
const lCommentHead = alt(str('//'), str('#;'));
const lCommentContent = alt(
    join(
        seq(
            strIf(1, (c) => /[^\n\/]/.test(c)),
            strWhile(isButNL),
        ),
    ),
    str(''),
    eof(''),
);
const lComment = join(seq(lCommentHead, lCommentContent, str('\n')));

// Gap Between "Meaningful" Elements
const gapElem = once(alt(strWhile1(isSpace), lComment, rComment));
const gap = join(repeat(gapElem));
const gap1 = join(repeat1(gapElem));

// Document Dependencies (i.e., import, include, and includegenerator clauses)
const dependencyKeyword = alt(
    StR('import'),
    StR('include'),
    StR('includegenerator'),
);
const dependency = seq(dependencyKeyword, gap1, strWhile1(isButNL)).map(
    (parts) => new Dependency(...parts),
);
const dependencies = repeat(dependency);

// Document Comments (only allowed before the class and class members)
const dCommentLine = join(
    seq(strWhile(isSpaceButNL), str('///'), strWhile(isButNL), str('\n')),
);
const dComment = repeat(dCommentLine).map((parts) => new Description(parts));

const name = alt(
    word((c) => isNumeral(c) || ['%', '.'].includes(c)),
    simpleString,
);

const nameWithPad = seq(gap, name, gap);
const nameList = seqDrop13('(', repeatSepWithStr(nameWithPad, ','), ')');

const value = join(
    once(
        repeat1(
            alt(
                balancedElement(),
                str('/'),
                str('_'),
                str('-'),
                str('.'),
                str('%'),
            ),
        ),
    ),
);

const typeParamWithPad = seqJoin(gap, value, gap, str('='), gap, value, gap);
const typeParamList = seqJoin(
    str('('),
    repeatSepWithStr(typeParamWithPad, ',').map((xs) => xs.join(',')),
    str(')'),
);
const clsType = seqJoin(value, optional(seqJoin(gap, typeParamList), ''));

const annType = seqJoin(gap, StR('as'), gap, clsType);

const annKeywords = (keywordName: Parser<string>) => {
    const keywordValueAnn = seqJoin(gap, str('='), gap, value);
    const keywordClause = alt(
        join(seq(keywordName, optional(keywordValueAnn, ''))),
        join(seq(StR('Not'), gap1, keywordName)),
    );
    const keywordWithPad = seq(gap, keywordClause, gap);
    const keywords = alt(repeatSepWithStr(keywordWithPad, ','), gap);
    const keywordList = seqDrop13('[', keywords, ']');
    const annKeywords = seq(gap, keywordList).map(
        (parts) => new AnnKeywordList(...parts),
    );
    return annKeywords;
};

const annKeywordsForClass = annKeywords(
    alt(
        StR('Abstract'),
        StR('ClassType'),
        StR('ClientDataType'),
        StR('ClientName'),
        StR('CompileAfter'),
        StR('DdlAllowed'),
        StR('DependsOn'),
        StR('Deprecated'),
        StR('Final'),
        StR('GeneratedBy'),
        StR('Hidden'),
        StR('Inheritance'),
        StR('Language'),
        StR('LegacyInstanceContext'),
        StR('NoExtent'),
        StR('OdbcType'),
        StR('Owner'),
        StR('ProcedureBlock'),
        StR('PropertyClass'),
        StR('ServerOnly'),
        StR('Sharded'),
        StR('SoapBindingStyle'),
        StR('SoapBodyUse'),
        StR('SqlCategory'),
        StR('SqlRowIdName'),
        StR('SqlRowIdPrivate'),
        StR('SqlTableName'),
        StR('StorageStrategy'),
        StR('System'),
        StR('ViewQuery'),
    ),
);

const annKeywordsForMethodLike = annKeywords(
    alt(
        StR('Abstract'),
        StR('ClientName'),
        StR('CodeMode'),
        StR('Deprecated'),
        StR('ExternalProcName'),
        StR('Final'),
        StR('ForceGenerate'),
        StR('GenerateAfter'),
        StR('Internal'),
        StR('Language'),
        StR('NotInheritable'),
        StR('PlaceAfter'),
        StR('Private'),
        StR('ProcedureBlock'),
        StR('PublicList'),
        StR('Requires'),
        StR('ReturnResultsets'),
        StR('ServerOnly'),
        StR('SoapAction'),
        StR('SoapBindingStyle'),
        StR('SoapBodyUse'),
        StR('SoapMessageName'),
        StR('SoapNameSpace'),
        StR('SoapRequestMessage'),
        StR('SoapTypeNameSpace'),
        StR('SqlName'),
        StR('SqlProc'),
        StR('WebMethod'),
    ),
);
const annKeywordForMember = annKeywords(name);

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

const ancestor = alt(name, nameList);

const annExtends = seq(gap1, StR('extends'), gap1, ancestor).map(
    (parts) => new Extends(...parts),
);

const annValue = seq(seqJoin(gap, str('='), gap), value).map(
    (parts) => new AnnValue(...parts),
);

const mParameter = seqDrop2(
    seq(
        StR('Parameter'),
        gap1,
        name,
        optional(annType),
        optional(annKeywords(name)),
        optional(annValue),
        gap,
    ),
    str(';'),
).map((parts) => {
    return new MParameter(...parts);
});

const propertyCollection = seqJoin(
    gap1,
    alt(StR('List'), StR('Array')),
    gap1,
    StR('Of'),
);

const asPropertyType = seqJoin(
    gap,
    StR('as'),
    optional(propertyCollection, ''),
    gap1,
    clsType,
);

const mPropertyOrProjection = seqDrop2(
    seq(
        alt(
            StR('Property'),
            StR('Relationship'), // relationship is a kind of property
            StR('Projection'),
        ),
        gap1,
        name,
        optional(asPropertyType),
        optional(annKeywords(name)),
        gap,
    ),
    str(';'),
).map((parts) => {
    return new MPropertyOrProjection(...parts);
});

const mIndex = seqDrop2(
    seq(
        alt(StR('index')),
        gap1,
        name,
        // TODO: fully understand the syntax of index
        strWhile((x) => x !== ';'),
    ),
    str(';'),
).map((parts) => {
    return new MIndex(...parts);
});

const mForeignKey = seqDrop2(
    seq(
        StR('foreignkey'),
        gap1,
        name,
        filter(nameList, (ns) => ns.length > 0),
        seqJoin(gap1, StR('References'), gap1),
        name,
        optional(seqJoin(gap, seqDrop13('(', name, ')'))),
        annKeywordForMember,
    ),
    str(';'),
).map((parts) => {
    return new MForeignKey(...parts);
});

const mXData = seq(
    alt(StR('xdata'), StR('storage')),
    gap1,
    name,
    optional(annKeywordForMember, null),
    gap,
    seqDrop13('{', balanced, '}'),
).map((parts) => {
    return new MXDataOrStorage(...parts);
});

const mTrigger = seq(
    StR('trigger'),
    gap1,
    name,
    optional(annKeywordForMember),
    gap,
    seqDrop13('{', balanced, '}'),
).map((parts) => new MTrigger(...parts));

const methodBody = seqDrop13('{', balanced, '}');
const mMethodLike = seq(
    alt(StR('trigger'), StR('method'), StR('classmethod'), StR('query')),
    gap1,
    name,
    gap,
    argList,
    optional(annType),
    optional(annKeywordsForMethodLike),
    gap,
    methodBody,
).map((parts) => {
    return new MethodLikeMember(...parts);
});

const member = alt<Member>(
    mParameter,
    mPropertyOrProjection,
    mIndex,
    mForeignKey,
    mXData,
    mTrigger,
    mMethodLike,
);
const memberWithComment = seq(dComment, gap, member).map(
    ([description, gapDescriptionKeyword, member]) => {
        member.setDescription(description, gapDescriptionKeyword);
        return member;
    },
);
const members = repeatSep(gap, memberWithComment);
const memberList = seqDrop13('{', members, '}');
const document = seqDrop2(
    seq(
        gap,
        dependencies,
        gap,
        dComment,
        gap,
        StR('class'),
        gap1,
        name,
        optional(annExtends),
        optional(annKeywordsForClass),
        gap,
        memberList,
        gap,
    ),
    eof(null),
).map((parts) => {
    return new Document(...parts);
});

export const parseDocument = (input: string): Document | undefined => {
    return document.exec(input)[0]?.value;
};
