type NStr = {
    kind: 'str';
    caseInsensitive?: boolean;
    content: string;
};
type NRef = {
    kind: 'ref';
    content: symbol;
};
export type NAlt = {
    kind: 'alt';
    content: Node[];
};
export type NSeq = {
    kind: 'seq';
    content: Node[];
};
type NPat = {
    kind: 'pat';
    content: string;
};
type NRep = {
    kind: 'rep';
    content: Node;
};
type NRep1 = {
    kind: 'rep1';
    content: Node;
};
type NodeAnnotation = {
    annotations?: string[];
};
// Encode EOF with undefined
export type Node = (NStr | NRef | NAlt | NSeq | NPat | NRep | NRep1) &
    NodeAnnotation;

export function displayNode(
    node: Node,
    topLevel = true,
    inAlt = false,
): string {
    switch (node.kind) {
        case 'alt': {
            if (topLevel) {
                return node.content
                    .map((n) => '\n  | ' + displayNode(n, false, true))
                    .join('');
            }
            const content = [...node.content];
            const isOptional =
                content.length > 0 && isEmpty(content[content.length - 1]!);
            if (isOptional) {
                content.pop();
            }
            let o = '';
            if (content.length > 0) {
                o =
                    '(' +
                    node.content
                        .map((n) => displayNode(n, false, true))
                        .join(' | ') +
                    ')';
            } else {
                o = displayNode(node.content[0]!, false, false);
            }
            if (isOptional) {
                o += '?';
            }
            return o;
        }
        case 'seq':
            if (topLevel) {
                return node.content
                    .map((n) => '\n  ' + displayNode(n, false))
                    .join('');
            }
            const o = node.content.map((n) => displayNode(n, false)).join(' ');
            return inAlt ? o : `(${o})`;
        case 'pat':
            return node.content;
        case 'ref':
            return '<' + node.content.toString().slice(7, -1) + '>';
        case 'rep':
            return displayNode(node.content, false) + '*';
        case 'rep1':
            return displayNode(node.content, false) + '+';
        case 'str':
            return JSON.stringify(node.content);
    }
}
function isEmpty(x: Node) {
    return x.kind === 'seq' && x.content.length === 0;
}
