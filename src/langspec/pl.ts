import { alt } from './alt.js';
import {
    repeat,
    strIf,
    strWhile1,
    isLetter,
    isNumeral,
    isSymbol,
    repeat1,
    isSpace,
} from './index.js';
import { once, type Parser, rec } from './core.js';
import { seq } from './seq.js';

export const doubleQuotedContent = once(
    repeat(
        alt(
            // backslash followed by anything but newline
            strIf(2, (s) => /\\[^\n]/.test(s)),
            // anything but double quote or slash or newline
            strIf(1, (c) => /[^\\\n"]/.test(c)),
        ),
    ),
).intoStr();
export const singleQuotedContent = once(
    repeat(
        alt(
            // backslash followed by anything but newline
            strIf(2, (s) => /\\[^\n]/.test(s)),
            // anything but double quote or slash or newline
            strIf(1, (c) => /[^\\\n']/.test(c)),
        ),
    ),
).intoStr();
export const simpleDQString = seq('"', doubleQuotedContent, '"').intoStr();
export const simpleSQString = seq("'", singleQuotedContent, "'").intoStr();
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
            seq('(', balanced, ')').intoStr(),
            seq('[', balanced, ']').intoStr(),
            seq('{', balanced, '}').intoStr(),
            seq('<', balanced, '>').intoStr(),
        ),
    );

const balancedSection = once(repeat1(balancedElement())).intoStr();

export const balanced: Parser<string> = rec(() =>
    repeat(
        alt(
            once(strWhile1(isSpace)),
            strIf(1, isNonSpecialSymbol),
            balancedSection,
        ),
    ).intoStr(),
);

export function word(alsoLetter: (c: string) => boolean): Parser<string> {
    return once(strWhile1((c) => isLetter(c) || alsoLetter(c)));
}
