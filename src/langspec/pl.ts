import { alt } from "./alt.js";
import {
  flatten,
  repeat,
  strIf,
  seqFlatten,
  str,
  strWhile1,
  isLetter,
  isNumeral,
  isSymbol,
  repeat1,
  isSpace,
} from "./index.js";
import { once, type Parser, rec } from "./core.js";

export const doubleQuotedContent = flatten(
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
export const singleQuotedContent = flatten(
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
export const simpleDQString = seqFlatten(
  str('"'),
  doubleQuotedContent,
  str('"'),
);
export const simpleSQString = seqFlatten(
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
      seqFlatten(str("("), balanced, str(")")),
      seqFlatten(str("["), balanced, str("]")),
      seqFlatten(str("{"), balanced, str("}")),
      seqFlatten(str("<"), balanced, str(">")),
    ),
  );

const balancedSection = flatten(once(repeat1(balancedElement())));

export const balanced: Parser<string> = rec(() =>
  flatten(
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
