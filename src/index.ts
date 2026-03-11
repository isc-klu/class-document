import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { altN, anythingBalanced as anyBalanced, chars as readWhile, eof, firstN, flatten, isAlPhA, isButNL, isNumeral, isSpace, isSpaceButNL, join, literal, LiTeRaL, map, oneOff as once, optional, Reader, someChars as readWhile1, repeat, repeat1, repeatSep, seq, singleLineString, succ, take1, type Parser, drop2, drop13, seqFlatten, seqDrop13, seqDrop15 } from "./langspec.js";

const rCommentStart = literal("/*");
const rCommentContentUnit = altN(
    once(readWhile1((c) => c !== "*")),
    firstN(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentUnit));
const rCommentEnd = literal("*/");
const rComment = flatten(seq(rCommentStart, rCommentContent, rCommentEnd));

const lCommentHead = altN(
    literal("//"),
    literal("#;")
);
const lCommentContent = altN(
    eof(""),
    succ(""),
    flatten(seq(firstN(1, (c) => /[^\n\/]/.test(c)), readWhile(isButNL)))
);
const lComment = flatten(seq(lCommentHead, lCommentContent, literal("\n")))

const spaceUnit = once(altN(
    readWhile1(isSpace),
    lComment,
    rComment,
));
const space = flatten(repeat(spaceUnit));
const space1 = flatten(repeat1(spaceUnit));

const dependencyKeyword = altN(LiTeRaL("import"), LiTeRaL("include"), LiTeRaL("includegenerator"));
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
const name = altN(
    symbol,
    singleLineString
)
const nameWithPad = seq(space, name, space)

const nameList = seqDrop13(
    literal("("), drop2(repeatSep(nameWithPad, literal(","))), literal(")")
)

const classExtendsValue = altN(
    name,
    nameList
);
const classExtends = map(
    seq(space1, LiTeRaL("extends"), space1, classExtendsValue),
    (parts) => new Extends(...parts)
)

const keywordValue = map(seq(space, literal("="), space, anyBalanced), join)
const keyword =
    altN(
        flatten(seq(name, optional(keywordValue, ""))),
        flatten(seq(LiTeRaL("Not"), space1, name))
    )
const keywords = map(
    seq(
        space,
        drop13(
            seq(
                literal("["),
                drop2(repeatSep(map(seq(space, keyword, space), join), literal(","))),
                literal("]")
            ))
    ),
    (parts) => new Keywords(...parts)
)

const mPropertyLike = map(
    seq(
        dComment,
        space,
        altN(...[
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
        map(seq(literal('('), repeatSep(name, seqFlatten(space, literal(","), space)), literal(')')), ([_1, ids, _2]) => ids),
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
            altN(
                LiTeRaL("xdata"),
                LiTeRaL("storage")
            ),
            space1,
            name,
            optional(keywords, null),
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
        optional(keywords),
        space,
        drop13(seq(literal('{'), anyBalanced, literal('}')))
    ),
    (parts) => new TriggerLikeMember(...parts)
)

const annOutputKeyword = altN(
    LiTeRaL("Output"),
    LiTeRaL("ByRef")
)
const annOutput = flatten(
    seq(annOutputKeyword, space1)
)
const annAs = seqFlatten(
    space, LiTeRaL("as"), space, anyBalanced
)
const annEq = seqFlatten(
    space, literal("="), space, anyBalanced
)
const parameter = seqFlatten(
    optional(annOutput), name, optional(annAs), optional(annEq)
)
const parameters = repeatSep(parameter, seqFlatten(space, literal(","), space));
const parameterList = seqDrop15(
    literal('('), space, parameters, space, literal(')')
)
const mMethodSignature = seq(
    dComment,
    space,
    altN(
        LiTeRaL("trigger"),
        LiTeRaL("method"),
        LiTeRaL("classmethod"),
        LiTeRaL("query"),
    ),
    space1,
    name,
    space,
    parameterList,
    optional(annAs, ""),
)
const mMethodBody = seqDrop13(
    literal('{'),
    anyBalanced,
    literal('}')
)
const mMethodLike = map(
    seq(
        mMethodSignature,
        optional(keywords),
        space,
        mMethodBody
    ),
    ([h1, h2, h3, body]) => {
        return new MethodLikeMember(...h1, h2, h3, body)
    }
)

const member = altN<Member>(mPropertyLike, mForeignKey, mXData, mTrigger, mMethodLike)
const members = repeatSep(space, member)

const documentBlock: Parser<[string[], (string | Member)[]]> = map(
    seq(
        literal("{"),
        members,
        literal("}"),
    ),
    ([_1, x, _2]) => x
)
const document = map(
    seq(
        // before the class keyword
        seq(
            space,
            dependencies,
            space,
            dComment,
            space,
        ),
        // before "{"
        seq(
            LiTeRaL("class"),
            space1,
            name,
            optional(classExtends),
            optional(keywords),
            space,
        ),
        documentBlock,
        space,
        eof(null)
    ),
    ([beforeClass, header, members, afterClass]) => {
        return new Document(
            ...beforeClass,
            ...header,
            members,
            afterClass
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
