import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { readWhile, eof, readIf, flatten, isButNL, isNumeral, isSpace, isSpaceButNL, readStr, readStR, map, once, Reader, readWhile1, repeat, repeat1, repeatSep, take1, seqFlatten, seqDrop13, seqDrop2, repeatSepWithStr, isLetter, filter, dbg, type Parser } from "./langspec/index.js";
import { balanced, balancedElement, simpleString, word } from "./langspec/pl.js";
import { alt, optional } from "./langspec/alt.js";
import { seq } from "./langspec/seq.js";

// Range Comment
const rCommentStart = readStr("/*");
const rCommentContentElem = alt(
    once(readWhile1((c) => c !== "*")),
    readIf(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentElem));
const rCommentEnd = readStr("*/");
const rComment = flatten(seq(rCommentStart, rCommentContent, rCommentEnd));

// Line Comment
const lCommentHead = alt(
    readStr("//"),
    readStr("#;")
);
const lCommentContent = alt(
    flatten(seq(readIf(1, (c) => /[^\n\/]/.test(c)), readWhile(isButNL))),
    readStr(""),
    eof(""),
);
const lComment = flatten(seq(lCommentHead, lCommentContent, readStr("\n")))

// Gap Between "Meaningful" Elements
const gapElem = once(alt(
    readWhile1(isSpace),
    lComment,
    rComment,
));
const gap = flatten(repeat(gapElem));
const gap1 = flatten(repeat1(gapElem));

// Document Dependencies (i.e., import, include, and includegenerator clauses)
const dependencyKeyword = alt(readStR("import"), readStR("include"), readStR("includegenerator"));
const dependency = map(
    seq(dependencyKeyword, gap1, readWhile1(isButNL)),
    (parts) => new Dependency(...parts)
);
const dependencies = repeat(dependency);

// Document Comments (only allowed before the class and class members)
const dCommentLine = flatten(
    seq(readWhile(isSpaceButNL), readStr("///"), readWhile(isButNL), readStr("\n"))
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
    readStr("/"),
    readStr("_"),
    readStr("-"),
    readStr("."),
    readStr("%")
))));

const typeParamWithPad = seqFlatten(gap, value, gap, readStr("="), gap, value, gap)
const typeParamList = seqFlatten(
    readStr("("), map(repeatSepWithStr(typeParamWithPad, ","), (xs) => xs.join(",")), readStr(")")
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
    gap, readStR("as"), gap, clsType
)

const annKeywords = (keywordName: Parser<string>) => {
    const keywordValueAnn = seqFlatten(gap, readStr("="), gap, value)
    const keywordClause =
        alt(
            flatten(seq(keywordName, optional(keywordValueAnn, ""))),
            flatten(seq(readStR("Not"), gap1, keywordName))
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
    readStR("Abstract"),
    readStR("ClassType"),
    readStR("ClientDataType"),
    readStR("ClientName"),
    readStR("CompileAfter"),
    readStR("DdlAllowed"),
    readStR("DependsOn"),
    readStR("Deprecated"),
    readStR("Final"),
    readStR("GeneratedBy"),
    readStR("Hidden"),
    readStR("Inheritance"),
    readStR("Language"),
    readStR("LegacyInstanceContext"),
    readStR("NoExtent"),
    readStR("OdbcType"),
    readStR("Owner"),
    readStR("ProcedureBlock"),
    readStR("PropertyClass"),
    readStR("ServerOnly"),
    readStR("Sharded"),
    readStR("SoapBindingStyle"),
    readStR("SoapBodyUse"),
    readStR("SqlCategory"),
    readStR("SqlRowIdName"),
    readStR("SqlRowIdPrivate"),
    readStR("SqlTableName"),
    readStR("StorageStrategy"),
    readStR("System"),
    readStR("ViewQuery")
));

const propertyAnnKeywords = annKeywords(alt(
    readStR("Aliases"),
    readStR("Calculated"),
    readStR("Cardinality"),
    readStR("ClientName"),
    readStR("Collection"),
    readStR("ComputeLocalOnly"),
    readStR("Deferred"),
    readStR("Deprecated"),
    readStR("Final"),
    readStR("Identity"),
    readStR("InitialExpression"),
    readStR("Internal"),
    readStR("Inverse"),
    readStR("MultiDimensional"),
    readStR("OnDelete"),
    readStR("Private"),
    readStR("ReadOnly"),
    readStR("Required"),
    readStR("ServerOnly"),
    readStR("SqlColumnNumber"),
    readStR("SqlComputeCode"),
    readStR("SqlComputed"),
    readStR("SqlComputeOnChange"),
    readStR("SqlFieldName"),
    readStR("SqlListDelimiter"),
    readStR("SqlListType"),
    readStR("Transient"),
))
const methodAnnKeywords = annKeywords(alt(
    readStR("Abstract"),
    readStR("ClientName"),
    readStR("CodeMode"),
    readStR("Deprecated"),
    readStR("ExternalProcName"),
    readStR("Final"),
    readStR("ForceGenerate"),
    readStR("GenerateAfter"),
    readStR("Internal"),
    readStR("Language"),
    readStR("NotInheritable"),
    readStR("PlaceAfter"),
    readStR("Private"),
    readStR("ProcedureBlock"),
    readStR("PublicList"),
    readStR("Requires"),
    readStR("ReturnResultsets"),
    readStR("ServerOnly"),
    readStR("SoapAction"),
    readStR("SoapBindingStyle"),
    readStR("SoapBodyUse"),
    readStR("SoapMessageName"),
    readStR("SoapNameSpace"),
    readStR("SoapRequestMessage"),
    readStR("SoapTypeNameSpace"),
    readStR("SqlName"),
    readStR("SqlProc"),
    readStR("WebMethod"),
))
const memberAnnKeywords = annKeywords(name)

const parameterAnnOutput = alt(
    seqFlatten(readStR("Output"), gap1),
    seqFlatten(readStR("ByRef"), gap1),
)
const parameterAnnEq = seqFlatten(
    gap, readStr("="), gap, balanced
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
    seq(gap1, readStR("extends"), gap1, ancestor),
    (parts) => new Extends(...parts)
)

const mParameterLike = map(
    seqDrop2(
        seq(
            alt(
                readStR("parameter"),
                readStR("property"),
                readStR("projection"),
                readStR("index"),
                readStR("relationship"),
            ),
            gap1,
            name,
            readWhile((x) => x !== ";"),
        ),
        readStr(";")
    ),
    (parts) => {
        return new PropertyLikeMember(...parts)
    }
)

const mForeignKey = map(
    seqDrop2(
        seq(
            readStR("foreignkey"),
            gap1,
            name,
            filter(nameList, (ns) => ns.length > 0),
            seqFlatten(
                gap1,
                readStR("References"),
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
        readStr(";")
    ),
    (parts) => {
        return new ForeignKeyLikeMember(...parts)
    }
)

const mXData = map(
    seq(
        alt(
            readStR("xdata"),
            readStR("storage")
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
        readStR("trigger"),
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
            readStR("trigger"),
            readStR("method"),
            readStR("classmethod"),
            readStR("query")
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
            readStR("class"),
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
    const reader = new Reader(input);
    return take1(document(reader))?.value
}
