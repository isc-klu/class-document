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
    Trigger,
    MXDataOrStorage,
    MPropertyOrProjection,
} from './classes.js';
import {
    strIf,
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
    seqStr,
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
const rCommentContent = repeat(rCommentContentElem).intoStr();
const rCommentEnd = str('*/');
const rComment = seq(rCommentStart, rCommentContent, rCommentEnd).intoStr();

// Line Comment
const lCommentHead = alt(str('//'), str('#;'));
const lCommentContent = alt(
    seq(
        strIf(1, (c) => /[^\n\/]/.test(c)),
        strWhile(isButNL),
    ).intoStr(),
    str(''),
    eof(''),
);
const lComment = seq(lCommentHead, lCommentContent, str('\n')).intoStr();

// Gap Between "Meaningful" Elements
const gapElem = once(alt(strWhile1(isSpace), lComment, rComment));
const gap = repeat(gapElem).intoStr();
const gap1 = repeat1(gapElem).intoStr();

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
const dCommentLine = seq(
    strWhile(isSpaceButNL),
    str('///'),
    strWhile(isButNL),
    str('\n'),
).intoStr();
const dComment = repeat(dCommentLine).map((parts) => new Description(parts));

const name = alt(
    word((c) => isNumeral(c) || ['%', '.'].includes(c)),
    simpleString,
);

const nameWithPad = seq(gap, name, gap);
const nameList = seqDrop13('(', repeatSepWithStr(nameWithPad, ','), ')');

const value = once(
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
).intoStr();

const typeParamWithPad = seqStr(gap, value, gap, str('='), gap, value, gap);
const typeParamList = seqStr(
    str('('),
    repeatSepWithStr(typeParamWithPad, ',').map((xs) => xs.join(',')),
    str(')'),
);
const clsType = seqStr(value, optional(seqStr(gap, typeParamList), ''));

const annType = seqStr(gap, StR('as'), gap, clsType);

const annKeywords = (keywordName: Parser<string>) => {
    const keywordValueAnn = seqStr(gap, str('='), gap, value);
    const keywordClause = alt(
        seq(keywordName, optional(keywordValueAnn, '')).intoStr(),
        seq(StR('Not'), gap1, keywordName).intoStr(),
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

const annArgMode = alt(seqStr(StR('Output'), gap1), seqStr(StR('ByRef'), gap1));
const annArgDefault = seqStr(gap, str('='), gap, value);
const arg = seqStr(
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

const annValue = seq(seqStr(gap, str('='), gap), value).map(
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

const propertyCollection = seqStr(
    gap1,
    alt(StR('List'), StR('Array')),
    gap1,
    StR('Of'),
);

const asPropertyType = seqStr(
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
        seqStr(gap1, StR('References'), gap1),
        name,
        optional(seqStr(gap, seqDrop13('(', name, ')'))),
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

const trigger = seq(
    StR('trigger').named('keyword'),
    gap1.named('gapKeywordName'),
    name.named('name'),
    optional(annKeywordForMember).named('keywordList'),
    gap.named('gapNameEnd'),
    seq(str('{'), balanced, str('}')).takeM().named('implementation'),
)
    .intoObj()
    .map((parts) => new Trigger(parts));

const methodBody = seq(str('{'), balanced, str('}')).takeM();
const mMethodLike = seq(
    alt(StR('trigger'), StR('method'), StR('classmethod'), StR('query')).named(
        'keyword',
    ),
    gap1.named('gapKeywordName'),
    name.named('name'),
    gap.named('gapNameParen'),
    argList.named('parameters'),
    optional(annType).named('typeAnn'),
    optional(annKeywordsForMethodLike).named('keywords'),
    gap.named('gapNameEnd'),
    methodBody.named('content'),
)
    .intoObj()
    .map((parts) => {
        return new MethodLikeMember(parts);
    });

const member = alt<Member>(
    mParameter,
    mPropertyOrProjection,
    mIndex,
    mForeignKey,
    mXData,
    trigger,
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
