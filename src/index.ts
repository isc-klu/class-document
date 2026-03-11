import { Dependency, Description, Extends, Keywords, PropertyLikeMember, ForeignKeyLikeMember, XDataLikeMember, TriggerLikeMember, MethodLikeMember, Member, Document } from "./classes.js";
import { alt2, altN, anythingBalanced, chars, eof, firstN, isAlPhA, isButNL, isNumeral, isSpace, isSpaceButNL, join, literal, LiTeRaL, map, oneOff, repeatSome, Reader, sepList, seq2, seq3, seq4, seq5, seq6, seq8, seq9, seqN, singleLineString, someChars, succ, take1, repeat, type Parser } from "./langspec.js";

const rangeCommentUnit = altN(
    someChars((c) => c !== "*"),
    firstN(2, (s) => s != "*/"),
)
const lineComment = map(seqN(altN(literal("//"), literal("#;")), chars(isButNL), literal("\n")), join)
const rangeComment = map(seq3(literal("/*"), map(repeat(rangeCommentUnit), join), literal("*/")), join);
const gapUnit = oneOff(altN(
    someChars(isSpace),
    lineComment,
    rangeComment,
));
const maybeGap = map(repeat(gapUnit), join);
const strictGap = map(repeatSome(gapUnit), join);
const dependency = map(
    seq3(
        altN(LiTeRaL("import"), LiTeRaL("include"), LiTeRaL("includegenerator")),
        strictGap,
        someChars(isButNL),
    ),
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

const symbol = someChars((c) => {
    return isAlPhA(c) || isNumeral(c) || c === "%" || c === "." || c === "_"
})
const name = altN(symbol, singleLineString)

const parentList = map(
    seq3(
        literal("("),
        map(
            sepList(map(seqN(maybeGap, name, maybeGap), join), literal(",")),
            ([parents, _gaps]) => parents
        ),
        literal(")"),
    ),
    ([_1, parents, _2]) => parents
)

const parents = map(
    seq4(
        strictGap,
        LiTeRaL("extends"),
        strictGap,
        alt2(name, parentList),
    ),
    (parts) => new Extends(...parts)
)

// We will figure out details later.
const keywordValue = map(seqN(maybeGap, literal("="), maybeGap, anythingBalanced), join)
const keyword = map(
    altN(
        seqN(name, altN(keywordValue, succ(""))),
        seqN(LiTeRaL("Not"), strictGap, name)
    ),
    join
)
const keywords = map(
    seq4(
        maybeGap,
        literal("["),
        sepList(map(seqN(maybeGap, keyword, maybeGap), join), literal(",")),
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
        strictGap,
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
        strictGap,
        name,
        map(seq3(literal('('), sepList(name, map(seq3(maybeGap, literal(","), maybeGap), join)), literal(')')), ([_1, ids, _2]) => ids),
        strictGap,
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
            strictGap,
            name,
            alt2(keywords, succ(null)),
            maybeGap,
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
            strictGap,
            name,
            alt2(keywords, succ(null)),
            maybeGap,
        ),
        literal('{'),
        anythingBalanced,
        literal('}')
    ),
    ([head, _1, body, _2]) => {
        return new TriggerLikeMember(...head, body)
    }
)

const outputAnn = map(
    seq2(altN(LiTeRaL("Output"), LiTeRaL("ByRef")), strictGap),
    join
)
const typeAnn = map(
    seq4(maybeGap, LiTeRaL("as"), maybeGap, anythingBalanced),
    join
)
const defaultValue = map(
    seq4(maybeGap, literal("="), maybeGap, anythingBalanced),
    join
)
const parameter = map(seq4(
    alt2(
        outputAnn,
        succ("")
    ),
    name,
    alt2(typeAnn,
        succ("")),
    alt2(defaultValue,
        succ(""))),
    join)
const parameters = map(
    seq3(
        literal('('),
        seq3(
            maybeGap,
            sepList(parameter, map(seqN(maybeGap, literal(","), maybeGap), join)),
            maybeGap
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
    strictGap,
    name,
    maybeGap,
    parameters,
    altN(typeAnn, succ("")),
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
            alt2(keywords, succ(null)),
            maybeGap,
        ),
        ...methodBodyBlock
    ),
    ([head, _1, body, _2]) => {
        return new MethodLikeMember(...head, body)
    }
)

const member = altN<Member>(propertyLikeMember, foreignkeyLikeMember, xdataLikeMember, triggerLikeMember, methodLikeMember)
const members = sepList(maybeGap, member)

const documentBlock: Parser<[string[], (string | Member)[]]>= map(
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
            maybeGap,
            dependencies,
            maybeGap,
            description,
            maybeGap,
        ),
        // before "{"
        seq6(
            LiTeRaL("class"),
            strictGap,
            name,
            alt2(parents, succ(null)),
            alt2(keywords, succ(null)),
            maybeGap,
        ),
        documentBlock,
        maybeGap,
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
