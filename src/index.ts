import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { altN as alt, anythingBalanced as anyBalanced, chars as readWhile, eof, firstN, flatten, isAlPhA, isButNL, isNumeral, isSpace, isSpaceButNL, literal, LiTeRaL, map, oneOff as once, optional, Reader, someChars as readWhile1, repeat, repeat1, repeatSep, singleLineString, succ, take1, type Parser, drop2, drop13, seqFlatten, seqDrop13, seqDrop15, seqDrop2 } from "./langspec.js";
import { seq } from "./seq.js";

const rCommentStart = literal("/*");
const rCommentContentUnit = alt(
    once(readWhile1((c) => c !== "*")),
    firstN(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentUnit));
const rCommentEnd = literal("*/");
const rComment = flatten(seq(rCommentStart, rCommentContent, rCommentEnd));

const lCommentHead = alt(
    literal("//"),
    literal("#;")
);
const lCommentContent = alt(
    eof(""),
    succ(""),
    flatten(seq(firstN(1, (c) => /[^\n\/]/.test(c)), readWhile(isButNL)))
);
const lComment = flatten(seq(lCommentHead, lCommentContent, literal("\n")))

const spaceUnit = once(alt(
    readWhile1(isSpace),
    lComment,
    rComment,
));
const space = flatten(repeat(spaceUnit));
const space1 = flatten(repeat1(spaceUnit));

const dependencyKeyword = alt(LiTeRaL("import"), LiTeRaL("include"), LiTeRaL("includegenerator"));
const dependency = map(
    seq(dependencyKeyword, space1, readWhile1(isButNL)),
    (parts) => new Dependency(...parts)
);
const dependencies = repeat(dependency);

const dCommentLine = flatten(
    seq(readWhile(isSpaceButNL), literal("///"), readWhile(isButNL), literal("\n"))
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
    literal("("), drop2(repeatSep(nameWithPad, literal(","))), literal(")")
)

const clsType = anyBalanced

const asType = seqFlatten(
    space, LiTeRaL("as"), space, clsType
)

const keywordValue = seqFlatten(space, literal("="), space, anyBalanced)
const keyword =
    alt(
        flatten(seq(name, optional(keywordValue, ""))),
        flatten(seq(LiTeRaL("Not"), space1, name))
    )
const keywordWithPad = seq(space, keyword, space);
const keywords = drop2(repeatSep(keywordWithPad, literal(",")));
const keywordList = seqDrop13(literal("["), keywords, literal("]"));

const annKeywords = map(
    seq(space, keywordList),
    (parts) => new Keywords(...parts)
)

const parameterAnnOutput = alt(
    seqFlatten(LiTeRaL("Output"), space1),
    seqFlatten(LiTeRaL("ByRef"), space1),
)
const parameterAnnEq = seqFlatten(
    space, literal("="), space, anyBalanced
)
const parameter = seqFlatten(
    optional(parameterAnnOutput), name, optional(asType), optional(parameterAnnEq)
)
const parameterWithPad = seq(space, parameter, space)
const parameters = drop2(repeatSep(parameterWithPad, literal(",")));
const parameterList = seqDrop13(literal('('), parameters, literal(')'))

const ancestor = alt(
    name,
    nameList
);

const annExtends = map(
    seq(space1, LiTeRaL("extends"), space1, ancestor),
    (parts) => new Extends(...parts)
)

const mPropertyLike = map(
    seq(
        dComment,
        space,
        alt(...[
            "parameter",
            "property",
            "projection",
            "index",
            "foreignkey",
            "relationship",
        ].map(LiTeRaL)),
        space1,
        name,
        readWhile((x) => x !== ";"),
        literal(";")
    ),
    ([description, gap0, keyword, gap1, name, content, _]) => {
        return new PropertyLikeMember(description, gap0, keyword, gap1, name, content)
    }
)

const mForeignKey = map(
    seq(
        dComment,
        space,
        LiTeRaL("foreignkey"),
        space1,
        name,
        nameList,
        space1,
        readWhile((x) => x !== ";"),
        literal(";")
    ),
    ([description, gap0, keyword, gap1, name, ids, gap2, content, _]) => {
        return new ForeignKeyLikeMember(description, gap0, keyword, gap1, name, ids, gap2, content)
    }
)

const mXData = map(
    seq(
        seq(
            dComment,
            space,
            alt(
                LiTeRaL("xdata"),
                LiTeRaL("storage")
            ),
            space1,
            name,
            optional(annKeywords, null),
            space,
        ),
        literal('{'),
        anyBalanced,
        literal('}')
    ),
    ([head, _1, body, _2]) => {
        return new XDataLikeMember(...head, body)
    }
)

const mTrigger = map(
    seq(
        dComment,
        space,
        LiTeRaL("trigger"),
        space1,
        name,
        optional(annKeywords),
        space,
        drop13(seq(literal('{'), anyBalanced, literal('}')))
    ),
    (parts) => new TriggerLikeMember(...parts)
)

const mMethodSignature = seq(
    dComment,
    space,
    alt(
        LiTeRaL("trigger"),
        LiTeRaL("method"),
        LiTeRaL("classmethod"),
        LiTeRaL("query"),
    ),
    space1,
    name,
    space,
    parameterList,
    optional(asType, ""),
)
const mMethodBody = seqDrop13(
    literal('{'),
    anyBalanced,
    literal('}')
)
const mMethodLike = map(
    seq(
        mMethodSignature,
        optional(annKeywords),
        space,
        mMethodBody
    ),
    ([h1, h2, h3, body]) => {
        return new MethodLikeMember(...h1, h2, h3, body)
    }
)

const member = alt<Member>(mPropertyLike, mForeignKey, mXData, mTrigger, mMethodLike)
const members = repeatSep(space, member)
const memberList: Parser<[string[], Member[]]> =
    seqDrop13(
        literal("{"),
        members,
        literal("}"),
    )

const document = map(
    seqDrop2(
        seq(
            space,
            dependencies,
            space,
            dComment,
            space,
            LiTeRaL("class"),
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
