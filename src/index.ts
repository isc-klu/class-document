import { Dependency, Description, Document, Extends, ForeignKeyLikeMember, Keywords, Member, MethodLikeMember, PropertyLikeMember, TriggerLikeMember, XDataLikeMember } from "./classes.js";
import { alt2, altN, anythingBalanced, chars, eof, firstN, flatten, isAlPhA, isButNL, isNumeral, isSpace, isSpaceButNL, join, literal, LiTeRaL, map, oneOff as once, optional, Reader, someChars as readWhile1, repeat, repeat1, repeatSep, seq2, seq3, seq4, seq5, seq6, seq8, seq9, seqN, singleLineString, succ, take1, type Parser } from "./langspec.js";

const rCommentStart = literal("/*");
const rCommentContentUnit = altN(
    once(readWhile1((c) => c !== "*")),
    firstN(2, (s) => s != "*/"),
)
const rCommentContent = flatten(repeat(rCommentContentUnit));
const rCommentEnd = literal("*/");
const rComment = flatten(seq3(rCommentStart, rCommentContent, rCommentEnd));

const lCommentHead = altN(
    literal("//"),
    literal("#;")
);
const lCommentContent = chars(isButNL);
const lComment = flatten(seqN(lCommentHead, lCommentContent, literal("\n")))

const spaceUnit = once(altN(
    readWhile1(isSpace),
    lComment,
    rComment,
));
const space = flatten(repeat(spaceUnit));
const space1 = flatten(repeat1(spaceUnit));


const dependencyKeyword = altN(LiTeRaL("import"), LiTeRaL("include"), LiTeRaL("includegenerator"));
const dependency = map(
    seq3(dependencyKeyword, space1, readWhile1(isButNL)),
    (parts) => new Dependency(...parts)
);
const dependencies = repeat(dependency);
const descriptionLine = map(
    seqN(chars(isSpaceButNL), literal("///"), chars(isButNL), literal("\n")),
    join
);
const description = map(
    repeat(descriptionLine),
    (parts) => new Description(parts),
)

const symbol = readWhile1((c) => {
    return isAlPhA(c) || isNumeral(c) || c === "%" || c === "." || c === "_"
})
const name = altN(symbol, singleLineString)

const parentList = map(
    seq3(
        literal("("),
        map(
            repeatSep(map(seqN(space, name, space), join), literal(",")),
            ([parents, _gaps]) => parents
        ),
        literal(")"),
    ),
    ([_1, parents, _2]) => parents
)

const parents = map(
    seq4(
        space1,
        LiTeRaL("extends"),
        space1,
        alt2(name, parentList),
    ),
    (parts) => new Extends(...parts)
)

// We will figure out details later.
const keywordValue = map(seqN(space, literal("="), space, anythingBalanced), join)
const keyword = map(
    altN(
        seqN(name, optional(keywordValue, "")),
        seqN(LiTeRaL("Not"), space1, name)
    ),
    join
)
const keywords = map(
    seq4(
        space,
        literal("["),
        repeatSep(map(seqN(space, keyword, space), join), literal(",")),
        literal("]"),
    ),
    ([gap, _2, [keywords, _commas], _3]) => new Keywords(gap, keywords)
)

const propertyLikeMember = map(
    seq6(
        description,
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
        chars((x) => x !== ";"),
        literal(";")
    ),
    ([description, keyword, gap1, name, content, _]) => {
        return new PropertyLikeMember(description, keyword, gap1, name, content)
    }
)

const foreignkeyLikeMember = map(
    seq8(
        description,
        LiTeRaL("foreignkey"),
        space1,
        name,
        map(seq3(literal('('), repeatSep(name, map(seq3(space, literal(","), space), join)), literal(')')), ([_1, ids, _2]) => ids),
        space1,
        chars((x) => x !== ";"),
        literal(";")
    ),
    ([description, keyword, gap1, name, ids, gap2, content, _]) => {
        return new ForeignKeyLikeMember(description, keyword, gap1, name, ids, gap2, content)
    }
)

const xdataLikeMember = map(
    seq4(
        seq6(
            description,
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
        anythingBalanced,
        literal('}')
    ),
    ([head, _1, body, _2]) => {
        return new XDataLikeMember(...head, body)
    }
)

const triggerLikeMember = map(
    seq4(
        seq6(
            description,
            LiTeRaL("trigger"),
            space1,
            name,
            optional(keywords),
            space,
        ),
        literal('{'),
        anythingBalanced,
        literal('}')
    ),
    ([head, _1, body, _2]) => {
        return new TriggerLikeMember(...head, body)
    }
)

const annOutput = map(
    seq2(altN(LiTeRaL("Output"), LiTeRaL("ByRef")), space1),
    join
)
const annAs = map(
    seq4(space, LiTeRaL("as"), space, anythingBalanced),
    join
)
const annEq = map(
    seq4(space, literal("="), space, anythingBalanced),
    join
)
const parameter = map(
    seq4(optional(annOutput), name, optional(annAs), optional(annEq)),
    join
)
const parameters = map(
    seq3(
        literal('('),
        seq3(
            space,
            repeatSep(parameter, map(seqN(space, literal(","), space), join)),
            space
        ),
        literal(')'),
    ),
    ([_1, params, _2]) => params
)
const methodSignature: [Parser<Description>, Parser<string>, Parser<string>, Parser<string>, Parser<string>, Parser<[string, [string[], string[]], string]>, Parser<string>] = [
    description,
    altN(
        LiTeRaL("trigger"),
        LiTeRaL("method"),
        LiTeRaL("classmethod"),
        LiTeRaL("query"),
    ),
    space1,
    name,
    space,
    parameters,
    altN(annAs, succ("")),
]
const methodBodyBlock: [Parser<string>, Parser<string>, Parser<string>] = [
    literal('{'),
    anythingBalanced,
    literal('}'),
]
const methodLikeMember = map(
    seq4(
        seq9(
            ...methodSignature,
            optional(keywords),
            space,
        ),
        ...methodBodyBlock
    ),
    ([head, _1, body, _2]) => {
        return new MethodLikeMember(...head, body)
    }
)

const member = altN<Member>(propertyLikeMember, foreignkeyLikeMember, xdataLikeMember, triggerLikeMember, methodLikeMember)
const members = repeatSep(space, member)

const documentBlock: Parser<[string[], (string | Member)[]]> = map(
    seq3(
        literal("{"),
        members,
        literal("}"),
    ),
    ([_1, x, _2]) => x
)
const document = map(
    seq5(
        // before the class keyword
        seq5(
            space,
            dependencies,
            space,
            description,
            space,
        ),
        // before "{"
        seq6(
            LiTeRaL("class"),
            space1,
            name,
            optional(parents),
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
