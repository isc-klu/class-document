import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { anythingBalanced as anyBalanced, readWhile as readWhile, eof, readIf, flatten, isAlPhA, isButNL, isNumeral, isSpace, isSpaceButNL, readStr, readStR, map, oneOff as once, optional, Reader, readWhile1 as readWhile1, repeat, repeat1, repeatSep, singleLineString, succ, take1, type Parser, drop2, drop13, seqFlatten, seqDrop13, seqDrop15, seqDrop2 } from "./langspec.js";
import { alt } from "./alt.js";
import { seq } from "./seq.js";

const rCommentStart = readStr("/*");
const rCommentContentUnit = alt(
    once(readWhile1((c) => c !== "*")),
    readIf(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentUnit));
const rCommentEnd = readStr("*/");
const rComment = flatten(seq(rCommentStart, rCommentContent, rCommentEnd));

const lCommentHead = alt(
    readStr("//"),
    readStr("#;")
);
const lCommentContent = alt(
    eof(""),
    succ(""),
    flatten(seq(readIf(1, (c) => /[^\n\/]/.test(c)), readWhile(isButNL)))
);
const lComment = flatten(seq(lCommentHead, lCommentContent, readStr("\n")))

const spaceUnit = once(alt(
    readWhile1(isSpace),
    lComment,
    rComment,
));
const space = flatten(repeat(spaceUnit));
const space1 = flatten(repeat1(spaceUnit));

const dependencyKeyword = alt(readStR("import"), readStR("include"), readStR("includegenerator"));
const dependency = map(
    seq(dependencyKeyword, space1, readWhile1(isButNL)),
    (parts) => new Dependency(...parts)
);
const dependencies = repeat(dependency);

const dCommentLine = flatten(
    seq(readWhile(isSpaceButNL), readStr("///"), readWhile(isButNL), readStr("\n"))
);
const dComment = map(
    repeat(dCommentLine),
    (parts) => new Description(parts),
)

const symbol = once(readWhile1((c) => isAlPhA(c) || isNumeral(c) || c === "%" || c === "." || c === "_"))
const name = alt(
    symbol,
    singleLineString
)
const nameWithPad = seq(space, name, space)

const nameList = seqDrop13(
    readStr("("), drop2(repeatSep(nameWithPad, readStr(","))), readStr(")")
)

const clsType = anyBalanced

const asType = seqFlatten(
    space, readStR("as"), space, clsType
)

const keywordValue = seqFlatten(space, readStr("="), space, anyBalanced)
const keyword =
    alt(
        flatten(seq(name, optional(keywordValue, ""))),
        flatten(seq(readStR("Not"), space1, name))
    )
const keywordWithPad = seq(space, keyword, space);
const keywords = drop2(repeatSep(keywordWithPad, readStr(",")));
const keywordList = seqDrop13(readStr("["), keywords, readStr("]"));

const annKeywords = map(
    seq(space, keywordList),
    (parts) => new Keywords(...parts)
)

const parameterAnnOutput = alt(
    seqFlatten(readStR("Output"), space1),
    seqFlatten(readStR("ByRef"), space1),
)
const parameterAnnEq = seqFlatten(
    space, readStr("="), space, anyBalanced
)
const parameter = seqFlatten(
    optional(parameterAnnOutput), name, optional(asType), optional(parameterAnnEq)
)
const parameterWithPad = seq(space, parameter, space)
const parameters = drop2(repeatSep(parameterWithPad, readStr(",")));
const parameterList = seqDrop13(readStr('('), parameters, readStr(')'))

const ancestor = alt(
    name,
    nameList
);

const annExtends = map(
    seq(space1, readStR("extends"), space1, ancestor),
    (parts) => new Extends(...parts)
)

const mPropertyLike = map(
    seqDrop2(
        seq(
            alt(
                readStR("parameter"),
                readStR("property"),
                readStR("projection"),
                readStR("index"),
                readStR("foreignkey"),
                readStR("relationship"),
            ),
            space1,
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
            space1,
            name,
            nameList,
            space1,
            readWhile((x) => x !== ";"),
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
        space1,
        name,
        optional(annKeywords, null),
        space,
        seqDrop13(
            readStr('{'),
            anyBalanced,
            readStr('}')
        )
    ),
    (parts) => {
        return new XDataLikeMember(...parts)
    }
)

const mTrigger = map(
    seq(
        readStR("trigger"),
        space1,
        name,
        optional(annKeywords),
        space,
        drop13(seq(readStr('{'), anyBalanced, readStr('}')))
    ),
    (parts) => new TriggerLikeMember(...parts)
)

const mMethodBody = seqDrop13(
    readStr('{'),
    anyBalanced,
    readStr('}')
)
const mMethodLike = map(
    seq(
        alt(
            readStR("trigger"),
            readStR("method"),
            readStR("classmethod"),
            readStR("query")
        ),
        space1,
        name,
        space,
        parameterList,
        optional(asType, ""),
        optional(annKeywords),
        space,
        mMethodBody
    ),
    (parts) => {
        return new MethodLikeMember(...parts)
    }
)

const member = alt<Member>(mPropertyLike, mForeignKey, mXData, mTrigger, mMethodLike)
const memberWithComment = map(
    seq(dComment, space, member),
    ([description, gapDescriptionKeyword, member]) => {
        member.setDescription(description, gapDescriptionKeyword)
        return member
    }
)
const members = repeatSep(space, memberWithComment)
const memberList = seqDrop13(readStr("{"), members, readStr("}"))

const document = map(
    seqDrop2(
        seq(
            space,
            dependencies,
            space,
            dComment,
            space,
            readStR("class"),
            space1,
            name,
            optional(annExtends),
            optional(annKeywords),
            space,
            memberList,
            space,
        ),
        eof(null)
    ),
    (parts) => {
        return new Document(...parts)
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
