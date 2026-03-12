import {
    AnnValue,
    Dependency,
    Description,
    Document,
    Extends,
    MForeignKey,
    AnnKeywordList,
    MethodLikeMember,
    MParameter,
    Index,
    Trigger,
    MXDataOrStorage,
    MPropertyOrProjection,
} from './classes.js';
import {
    isNotNL,
    isNumeral,
    isSpace,
    isSpaceButNL,
    strWhile1,
    repeatSep,
    repeatSepWithStr,
    alt,
    optional,
    seq,
    strIf,
    StR,
    repeat1,
    filter,
    strWhile,
    eof,
    once,
    type Parser,
} from './langspec/index.js';
import { repeat } from './langspec/index.js';
import {
    balanced,
    balancedElement,
    simpleString,
    word,
} from './langspec/pl.js';

// Range Comment
const rCommentStart = '/*';
const rCommentContentElem = alt(
    once(strWhile1((c) => c !== '*')),
    strIf(2, (s) => s != '*/'),
);
const rCommentContent = repeat(rCommentContentElem).intoStr();
const rCommentEnd = '*/';
const rComment = seq(rCommentStart, rCommentContent, rCommentEnd)
    .intoStr()
    .describe('RangeComment');

// Line Comment
const lCommentHead = alt('//', '#;');
const lCommentContent = alt(
    seq(
        strIf(1, (c) => /[^\n\/]/.test(c)),
        strWhile(isNotNL),
    ).intoStr(),
    '',
    eof(''),
);
const lComment = seq(lCommentHead, lCommentContent, '\n').intoStr();

// Gap Between "Meaningful" Elements
const gapElem = once(alt(strWhile1(isSpace), lComment, rComment));
const gap = repeat(gapElem).intoStr().markTrivial();
const gap1 = repeat1(gapElem).intoStr().markTrivial();

// Document Dependencies (i.e., import, include, and includegenerator clauses)
const dependencyKeyword = alt(
    StR('import'),
    StR('include'),
    StR('includegenerator'),
);
const dependency = seq(dependencyKeyword, gap1, strWhile1(isNotNL))
    .map((parts) => new Dependency(...parts))
    .describe('Import/Include/IncludeGenerator');
const dependencies = repeat(dependency);

const gapInline = strWhile(isSpaceButNL).markTrivial();

// Document Comments (only allowed before the class and class members)
const dCommentLine = seq(gapInline, '///', strWhile(isNotNL), '\n').intoStr();
const dComment = repeat(dCommentLine)
    .map((parts) => new Description(parts))
    .describe('Description');

const name = alt(
    word((c) => isNumeral(c) || ['%', '.'].includes(c)),
    simpleString,
).describe('Identifier');

function commaSeperatedListOf<X>(
    name: Parser<X>,
): Parser<string | [string, X, string][]> {
    const nameWithPad = seq(gap, name, gap);
    return seq('(', alt(repeatSepWithStr(nameWithPad, ','), gap), ')').takeM();
}

const nameWithPad = seq(gap, name, gap);
const nameList = seq('(', repeatSepWithStr(nameWithPad, ','), ')').takeM();

const value = once(repeat1(alt(balancedElement(), '/', '_', '-', '.', '%')))
    .intoStr()
    .describe('Value');

const typeParamWithPad = seq(gap, value, gap, '=', gap, value, gap).intoStr();
const typeParamList = seq(
    '(',
    repeatSepWithStr(typeParamWithPad, ',').map((xs) => xs.join(',')),
    ')',
).intoStr();
const clsType = seq(value, optional(seq(gap, typeParamList).intoStr(), ''))
    .intoStr()
    .describe('Class');

const annType = seq(gap, StR('As'), gap, clsType).intoStr();

const assignedKeyword = <Name extends string, Values extends string[]>(
    name: Name,
    values: Values,
) => seq(StR(name), gap, '=', gap, alt(...values.map((v) => StR(v)))).intoStr();

const assignedKeywordP = <Name extends string>(
    name: Name,
    value: Parser<string>,
) => seq(StR(name), gap, '=', gap, value).intoStr();

const genericAssignedKeyword = <Name extends string>(name: Name) =>
    seq(
        StR(name),
        gap,
        '=',
        gap,
        balancedElement((c) => /[_]/.test(c)).describe('...'),
    ).intoStr();

const negatableKeyword = <Name extends string>(name: Name) =>
    seq(optional(seq(StR('Not'), gap1).intoStr(), ''), StR(name)).intoStr();

const annKeywords = (keywordName: Parser<string>) => {
    const keywordValueAnn = seq(gap, '=', gap, value).intoStr();
    const keywordClause = alt(
        seq(keywordName, optional(keywordValueAnn, '')).intoStr(),
        seq(StR('Not'), gap1, keywordName).intoStr(),
    );
    const keywordWithPad = seq(gap, keywordClause, gap);
    const keywords = alt(repeatSepWithStr(keywordWithPad, ','), gap);
    const keywordList = seq('[', keywords, ']').takeM();
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
    ).describe('ClassKeywords'),
).describe('ClassKeywordList');

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
    ).describe('MethodKeywords'),
).describe('MethodKeywordList');
const genericKeywordList = annKeywords(name).describe('GenericKeywordList');
const annMemberKeywordList = genericKeywordList;

const annArgMode = seq(alt(StR('Output'), StR('ByRef')), gap1).intoStr();
const annArgDefault = seq(gap, '=', gap, value).intoStr();
const arg = seq(
    optional(annArgMode),
    name,
    optional(annType),
    optional(annArgDefault),
)
    .intoStr()
    .describe('Argument');
const argWithPad = seq(gap, arg, gap);
const args = once(repeatSepWithStr(argWithPad, ','));
const argList = seq('(', args, ')').takeM();

const ancestor = alt(name, nameList);

const annExtends = seq(gap1, StR('Extends'), gap1, ancestor)
    .map((parts) => new Extends(...parts))
    .describe('Extends');

const annValue = seq(seq(gap, '=', gap).intoStr(), value).map(
    (parts) => new AnnValue(...parts),
);

const parameter = seq(
    StR('Parameter'),
    gap1,
    name,
    optional(annType),
    optional(genericKeywordList),
    optional(annValue),
    gap,
    ';',
)
    .dropL()
    .map((parts) => {
        return new MParameter(...parts);
    })
    .describe('Parameter');

const propertyCollection = seq(
    gap1,
    alt(StR('List'), StR('Array')),
    gap1,
    StR('Of'),
).intoStr();

const asPropertyType = seq(
    gap,
    StR('As'),
    optional(propertyCollection, ''),
    gap1,
    clsType,
).intoStr();

const mPropertyOrProjection = seq(
    alt(
        StR('Property'),
        StR('Relationship'), // relationship is a kind of property
        StR('Projection'),
    ),
    gap1,
    name,
    optional(asPropertyType),
    optional(genericKeywordList),
    gap,
    ';',
)
    .dropL()
    .map((parts) => {
        return new MPropertyOrProjection(...parts);
    })
    .describe('Property/Relationship/Projection');

const collationType = alt(
    'EXACT',
    'SQLSTRING',
    seq('SQLUPPER', optional(seq('(', balanced, ')').intoStr(), '')).intoStr(),
    'TRUNCATE',
    'PLUS',
    'MINUS',
).describe('CollationType');

const indexPropertyExpression = seq(
    name,
    alt('(KEYS)', '(ELEMENTS)', ''),
    optional(seq(gap, StR('As'), gap, collationType).intoStr(), ''),
).intoStr();
const indexPropertyExpressionList = seq(
    gap,
    StR('On'),
    gap,
    alt(
        indexPropertyExpression,
        commaSeperatedListOf(indexPropertyExpression).map(
            (x) =>
                '(' +
                (typeof x === 'string'
                    ? x
                    : x.map((pep) => pep.join('')).join(',')) +
                ')',
        ),
    ),
).intoStr();

const indexKeywordList = annMemberKeywordList;

const index = seq(
    alt(StR('index')),
    gap1,
    name,
    // TODO: fully understand the syntax of index
    optional(indexPropertyExpressionList, ''),
    optional(indexKeywordList),
    ';',
)
    .dropL()
    .map((parts) => {
        return new Index(...parts);
    })
    .describe('Index');

const mForeignKey = seq(
    StR('ForeignKey'),
    gap1,
    name,
    filter(nameList, (ns) => ns.length > 0),
    seq(gap1, StR('References'), gap1).intoStr(),
    name,
    optional(seq(gap, seq('(', name, ')').takeM()).intoStr()),
    annMemberKeywordList,
    ';',
)
    .dropL()
    .map((parts) => {
        return new MForeignKey(...parts);
    })
    .describe('ForeignKey');

const mXData = seq(
    alt(StR('XData'), StR('Storage')),
    gap1,
    name,
    optional(annMemberKeywordList, null),
    gap,
    seq('{', balanced, '}').takeM(),
)
    .map((parts) => {
        return new MXDataOrStorage(...parts);
    })
    .describe('XData/Storage');

const triggerKeywords = alt(
    assignedKeyword('CodeMode', ['code', 'objectgenerator']),
    assignedKeyword('Event', [
        'DELETE',
        'INSERT',
        'UPDATE',
        'INSERT/UPDATE',
        'INSERT/DELETE',
        'UPDATE/DELETE',
        'INSERT/UPDATE/DELETE',
    ]),
    negatableKeyword('Final'),
    assignedKeyword('Foreach', ['row', 'row/object', 'statement']),
    negatableKeyword('Internal'),
    assignedKeyword('Language', ['objectscript', 'python', 'tsql']),
    genericAssignedKeyword('NewTable'),
    genericAssignedKeyword('OldTable'),
    assignedKeywordP('Order', strWhile1(isNumeral).describe('integer')),
    genericAssignedKeyword('SqlName'),
    assignedKeyword('Time', ['AFTER', 'BEFORE']),
    genericAssignedKeyword('UpdateColumnList'),
).describe('TriggerKeywords');

const triggerKeywordList = annKeywords(triggerKeywords);

const trigger = seq(
    StR('trigger').named('keyword'),
    gap1.named('gapKeywordName'),
    name.named('name'),
    optional(triggerKeywordList).named('keywordList'),
    gap.named('gapNameEnd'),
    seq('{', balanced, '}').takeM().named('implementation'),
)
    .intoObj()
    .map((parts) => new Trigger(parts))
    .describe('Trigger');

const methodBody = seq('{', balanced, '}').takeM();
const mMethodLike = seq(
    alt(StR('method'), StR('classmethod'), StR('query')).named('keyword'),
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
    })
    .describe('Method/ClassMethod/Query');

const member = alt(
    parameter,
    mPropertyOrProjection,
    index,
    mForeignKey,
    mXData,
    trigger,
    mMethodLike,
).describe('Member');
const memberWithComment = seq(dComment, gap, member).map(
    ([description, gapDescriptionKeyword, member]) => {
        member.setDescription(description, gapDescriptionKeyword);
        return member;
    },
);
const members = repeatSep(gap, memberWithComment);
const memberList = seq('{', members, '}').takeM();
export const document = seq(
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
    eof(null),
)
    .dropL()
    .map((parts) => {
        return new Document(...parts);
    });
