import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { strIf, flatten, isButNL, isNumeral, isSpace, isSpaceButNL, str, StR, map, strWhile1, repeat, repeat1, repeatSep, seqFlatten, seqDrop13, seqDrop2, repeatSepWithStr, filter } from "./langspec/index.js";
import { strWhile, eof } from "./langspec/core.js";
import { once, type Parser } from "./langspec/core.js";
import { balanced, balancedElement, simpleString, word } from "./langspec/pl.js";
import { alt, optional } from "./langspec/alt.js";
import { seq } from "./langspec/seq.js";

// Range Comment
const rCommentStart = str("/*");
const rCommentContentElem = alt(
    once(strWhile1((c) => c !== "*")),
    strIf(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentElem));
const rCommentEnd = str("*/");
const rComment = flatten(seq(rCommentStart, rCommentContent, rCommentEnd));

// Line Comment
const lCommentHead = alt(
    str("//"),
    str("#;")
);
const lCommentContent = alt(
    flatten(seq(strIf(1, (c) => /[^\n\/]/.test(c)), strWhile(isButNL))),
    str(""),
    eof(""),
);
const lComment = flatten(seq(lCommentHead, lCommentContent, str("\n")))

// Gap Between "Meaningful" Elements
const gapElem = once(alt(
    strWhile1(isSpace),
    lComment,
    rComment,
));
const gap = flatten(repeat(gapElem));
const gap1 = flatten(repeat1(gapElem));

// Document Dependencies (i.e., import, include, and includegenerator clauses)
const dependencyKeyword = alt(StR("import"), StR("include"), StR("includegenerator"));
const dependency = map(
    seq(dependencyKeyword, gap1, strWhile1(isButNL)),
    (parts) => new Dependency(...parts)
);
const dependencies = repeat(dependency);

// Document Comments (only allowed before the class and class members)
const dCommentLine = flatten(
    seq(strWhile(isSpaceButNL), str("///"), strWhile(isButNL), str("\n"))
);
const dComment = map(
    repeat(dCommentLine),
    (parts) => new Description(parts),
)

const name = alt(
    word((c) => isNumeral(c) || ["%", "."].includes(c)),
    simpleString
)

const nameWithPad = seq(gap, name, gap)
const nameList = seqDrop13(
    "(", repeatSepWithStr(nameWithPad, ","), ")"
)

const value = flatten(once(repeat1(alt(
    balancedElement(),
    str("/"),
    str("_"),
    str("-"),
    str("."),
    str("%")
))));

const typeParamWithPad = seqFlatten(gap, value, gap, str("="), gap, value, gap)
const typeParamList = seqFlatten(
    str("("), map(repeatSepWithStr(typeParamWithPad, ","), (xs) => xs.join(",")), str(")")
)
const clsType = seqFlatten(
    value,
    optional(
        seqFlatten(
            gap,
            typeParamList
        ),
        ""
    )
)

const asType = seqFlatten(
    gap, StR("as"), gap, clsType
)

const annKeywords = (keywordName: Parser<string>) => {
    const keywordValueAnn = seqFlatten(gap, str("="), gap, value)
    const keywordClause =
        alt(
            flatten(seq(keywordName, optional(keywordValueAnn, ""))),
            flatten(seq(StR("Not"), gap1, keywordName))
        )
    const keywordWithPad = seq(gap, keywordClause, gap);
    const keywords = alt(repeatSepWithStr(keywordWithPad, ","), gap);
    const keywordList = seqDrop13("[", keywords, "]");
    const annKeywords = map(
        seq(gap, keywordList),
        (parts) => new Keywords(...parts)
    )
    return annKeywords
}

const classAnnKeywords = annKeywords(alt(
    StR("Abstract"),
    StR("ClassType"),
    StR("ClientDataType"),
    StR("ClientName"),
    StR("CompileAfter"),
    StR("DdlAllowed"),
    StR("DependsOn"),
    StR("Deprecated"),
    StR("Final"),
    StR("GeneratedBy"),
    StR("Hidden"),
    StR("Inheritance"),
    StR("Language"),
    StR("LegacyInstanceContext"),
    StR("NoExtent"),
    StR("OdbcType"),
    StR("Owner"),
    StR("ProcedureBlock"),
    StR("PropertyClass"),
    StR("ServerOnly"),
    StR("Sharded"),
    StR("SoapBindingStyle"),
    StR("SoapBodyUse"),
    StR("SqlCategory"),
    StR("SqlRowIdName"),
    StR("SqlRowIdPrivate"),
    StR("SqlTableName"),
    StR("StorageStrategy"),
    StR("System"),
    StR("ViewQuery")
));

const propertyAnnKeywords = annKeywords(alt(
    StR("Aliases"),
    StR("Calculated"),
    StR("Cardinality"),
    StR("ClientName"),
    StR("Collection"),
    StR("ComputeLocalOnly"),
    StR("Deferred"),
    StR("Deprecated"),
    StR("Final"),
    StR("Identity"),
    StR("InitialExpression"),
    StR("Internal"),
    StR("Inverse"),
    StR("MultiDimensional"),
    StR("OnDelete"),
    StR("Private"),
    StR("ReadOnly"),
    StR("Required"),
    StR("ServerOnly"),
    StR("SqlColumnNumber"),
    StR("SqlComputeCode"),
    StR("SqlComputed"),
    StR("SqlComputeOnChange"),
    StR("SqlFieldName"),
    StR("SqlListDelimiter"),
    StR("SqlListType"),
    StR("Transient"),
))
const methodAnnKeywords = annKeywords(alt(
    StR("Abstract"),
    StR("ClientName"),
    StR("CodeMode"),
    StR("Deprecated"),
    StR("ExternalProcName"),
    StR("Final"),
    StR("ForceGenerate"),
    StR("GenerateAfter"),
    StR("Internal"),
    StR("Language"),
    StR("NotInheritable"),
    StR("PlaceAfter"),
    StR("Private"),
    StR("ProcedureBlock"),
    StR("PublicList"),
    StR("Requires"),
    StR("ReturnResultsets"),
    StR("ServerOnly"),
    StR("SoapAction"),
    StR("SoapBindingStyle"),
    StR("SoapBodyUse"),
    StR("SoapMessageName"),
    StR("SoapNameSpace"),
    StR("SoapRequestMessage"),
    StR("SoapTypeNameSpace"),
    StR("SqlName"),
    StR("SqlProc"),
    StR("WebMethod"),
))
const memberAnnKeywords = annKeywords(name)

const parameterAnnOutput = alt(
    seqFlatten(StR("Output"), gap1),
    seqFlatten(StR("ByRef"), gap1),
)
const parameterAnnEq = seqFlatten(
    gap, str("="), gap, balanced
)
const parameter = seqFlatten(
    optional(parameterAnnOutput), name, optional(asType), optional(parameterAnnEq)
)
const parameterWithPad = seq(gap, parameter, gap)
const parameters = once(repeatSepWithStr(parameterWithPad, ","));
const parameterList = seqDrop13('(', parameters, ')')

const ancestor = alt(
    name,
    nameList
);

const annExtends = map(
    seq(gap1, StR("extends"), gap1, ancestor),
    (parts) => new Extends(...parts)
)

const mParameterLike = map(
    seqDrop2(
        seq(
            alt(
                StR("parameter"),
                StR("property"),
                StR("projection"),
                StR("index"),
                StR("relationship"),
            ),
            gap1,
            name,
            strWhile((x) => x !== ";"),
        ),
        str(";")
    ),
    (parts) => {
        return new PropertyLikeMember(...parts)
    }
)

const mForeignKey = map(
    seqDrop2(
        seq(
            StR("foreignkey"),
            gap1,
            name,
            filter(nameList, (ns) => ns.length > 0),
            seqFlatten(
                gap1,
                StR("References"),
                gap1,
            ),
            name,
            optional(
                seqFlatten(
                    gap,
                    seqDrop13(
                        "(",
                        name,
                        ")",
                    )
                )
            ),
            memberAnnKeywords,
        ),
        str(";")
    ),
    (parts) => {
        return new ForeignKeyLikeMember(...parts)
    }
)

const mXData = map(
    seq(
        alt(
            StR("xdata"),
            StR("storage")
        ),
        gap1,
        name,
        optional(memberAnnKeywords, null),
        gap,
        seqDrop13(
            '{',
            balanced,
            '}'
        )
    ),
    (parts) => {
        return new XDataLikeMember(...parts)
    }
)

const mTrigger = map(
    seq(
        StR("trigger"),
        gap1,
        name,
        optional(memberAnnKeywords),
        gap,
        seqDrop13('{', balanced, '}')
    ),
    (parts) => new TriggerLikeMember(...parts)
)

const mMethodBody = seqDrop13('{', balanced, '}')
const mMethodLike = map(
    seq(
        alt(
            StR("trigger"),
            StR("method"),
            StR("classmethod"),
            StR("query")
        ),
        gap1,
        name,
        gap,
        parameterList,
        optional(asType),
        optional(methodAnnKeywords),
        gap,
        mMethodBody
    ),
    (parts) => {
        return new MethodLikeMember(...parts)
    }
)

const member = alt<Member>(mParameterLike, mForeignKey, mXData, mTrigger, mMethodLike)
const memberWithComment = map(
    seq(dComment, gap, member),
    ([description, gapDescriptionKeyword, member]) => {
        member.setDescription(description, gapDescriptionKeyword)
        return member
    }
)
const members = repeatSep(gap, memberWithComment)
const memberList = seqDrop13("{", members, "}")
const document = map(
    seqDrop2(
        seq(
            gap,
            dependencies,
            gap,
            dComment,
            gap,
            StR("class"),
            gap1,
            name,
            optional(annExtends),
            optional(classAnnKeywords),
            gap,
            memberList,
            gap,
        ),
        eof(null)
    ),
    (parts) => {
        return new Document(...parts)
    }
)

export const parseDocument = (input: string): Document | undefined => {
    return document.exec(input)[0]?.value;
}
