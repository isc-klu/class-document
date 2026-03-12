import { alt } from './alt.js';
import {
    join,
    repeat,
    strIf,
    seqJoin,
    str,
    strWhile1,
    isLetter,
    isNumeral,
    isSymbol,
    repeat1,
    isSpace,
} from './index.js';
import { once, type Parser, rec } from './core.js';

export const doubleQuotedContent = join(
    once(
        repeat(
            alt(
                // backslash followed by anything but newline
                strIf(2, (s) => /\\[^\n]/.test(s)),
                // anything but double quote or slash or newline
                strIf(1, (c) => /[^\\\n"]/.test(c)),
            ),
        ),
    ),
);
export const singleQuotedContent = join(
    once(
        repeat(
            alt(
                // backslash followed by anything but newline
                strIf(2, (s) => /\\[^\n]/.test(s)),
                // anything but double quote or slash or newline
                strIf(1, (c) => /[^\\\n']/.test(c)),
            ),
        ),
    ),
);
export const simpleDQString = seqJoin(
    str('"'),
    doubleQuotedContent,
    str('"'),
);
export const simpleSQString = seqJoin(
    str("'"),
    singleQuotedContent,
    str("'"),
);
export const simpleString = alt(simpleDQString, simpleSQString);

export const isNonSpecialSymbol = (c: string) =>
    isSymbol(c) && /[^()\[\]\{\}<>"']/u.test(c);

export const balancedElement = (
    alsoLetter: (c: string) => boolean = (_) => false,
) =>
    rec(() =>
        alt(
            word(alsoLetter),
            once(strWhile1(isNumeral)),
            simpleString,
            seqJoin(str('('), balanced, str(')')),
            seqJoin(str('['), balanced, str(']')),
            seqJoin(str('{'), balanced, str('}')),
            seqJoin(str('<'), balanced, str('>')),
        ),
    );

const balancedSection = join(once(repeat1(balancedElement())));

export const balanced: Parser<string> = rec(() =>
    join(
        repeat(
            alt(
                once(strWhile1(isSpace)),
                strIf(1, isNonSpecialSymbol),
                balancedSection,
            ),
        ),
    ),
);

export function word(alsoLetter: (c: string) => boolean): Parser<string> {
    return once(strWhile1((c) => isLetter(c) || alsoLetter(c)));
}
