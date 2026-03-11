import { alt } from "./alt.js";
import { flatten, once, repeat, readIf, seqFlatten, readStr, type Parser, rec, readWhile1, isLetter, isNumeral, isSymbol, repeat1, isSpace, repeatSep, readWhile, map, withReader, bind } from "./index.js";
import { seq } from "./seq.js";


export const doubleQuotedContent = flatten(
    once(repeat(alt(
        // backslash followed by anything but newline
        readIf(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        readIf(1, (c) => /[^\\\n"]/.test(c))
    )))
);
export const singleQuotedContent = flatten(
    once(repeat(alt(
        // backslash followed by anything but newline
        readIf(2, (s) => /\\[^\n]/.test(s)),
        // anything but double quote or slash or newline
        readIf(1, (c) => /[^\\\n']/.test(c))
    )))
);
export const simpleDQString = seqFlatten(readStr('"'), doubleQuotedContent, readStr('"'));
export const simpleSQString = seqFlatten(readStr("'"), singleQuotedContent, readStr("'"));
export const simpleString = alt(
    simpleDQString,
    simpleSQString
);

export const isNonSpecialSymbol = (c: string) => (
    isSymbol(c) &&
    /[^()\[\]\{\}<>"']/u.test(c)
)

export const balancedElement = rec(() => map(alt(once(readWhile1(isLetter)),
    once(readWhile1(isNumeral)),
    simpleString,
    seqFlatten(readStr('('), balanced, readStr(')')),
    seqFlatten(readStr('['), balanced, readStr(']')),
    seqFlatten(readStr('{'), balanced, readStr('}')),
    seqFlatten(readStr('<'), balanced, readStr('>'))
),
    (x) => {
        // console.log(x)
        return x;
    }
));

const balancedSection = flatten(once(repeat1(balancedElement)))

export const balanced: Parser<string> = rec(() => flatten(
    repeat(
        alt(
            once(readWhile1(isSpace)),
            readIf(1, isNonSpecialSymbol),
            balancedSection
        )
    )
));
