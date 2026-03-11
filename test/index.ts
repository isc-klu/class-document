import * as fs from 'fs';
import { parseDocument } from '../src/index.js';
import assert from 'assert';

class Section {
    title: string;
    objectscript: string;
    structure: string;
    error: boolean;

    constructor(title: string, objectscript: string, structure: string, error: boolean) {
        this.title = title;
        this.objectscript = objectscript
        this.structure = structure
        this.error = error
    }
}

class Suite {
    content: Section[];
    constructor(string: string) {
        this.content = [];
        let lines = string.split("\n");
        let line: string | undefined;
        line = lines.shift();
        console.assert(line?.startsWith("==="), `This line should be the first "===" but it is ${line}`)
        while (true) {
            const title = lines.shift() as string;
            const errorOrCut = lines.shift() as string;
            const error = !(errorOrCut.startsWith("==="));
            if (error) {
                line = lines.shift();
                console.assert(line?.startsWith("==="), `This line should be "===" but it is ${line} (title = ${title})`)
            }
            const objectscript = [];
            line = lines.shift()
            while (line !== undefined && !line.startsWith('---')) {
                objectscript.push(line);
                line = lines.shift();
            }
            const structure = [];
            line = lines.shift()
            while (line !== undefined && !line.startsWith('===')) {
                structure.push(line);
                line = lines.shift();
            }
            if (line === undefined) {
                break;
            }
            this.content.push(new Section(title, objectscript.join("\n"), structure.join("\n"), error))
        }
    }
}

for (const file of fs.readdirSync(`./test/resource`)) {
    const fileString = fs.readFileSync(`./test/resource/${file}`);
    const suite = new Suite(fileString.toString());
    for (const sec of suite.content) {
        // console.log("At", sec.title)
        // ignore negative tests because many of seems to be about semantics.
        if (sec.error) {
            continue
        }
        try {
            const doc = parseDocument(sec.objectscript);
            assert.ok(!sec.error, `FAILED: ${sec.title}`);
            const roundtrip = doc.toString();
            assert.deepStrictEqual(roundtrip.split('\n'), sec.objectscript.split('\n'), `FAILED: ${sec.title} - Source is not preserved`)
        } catch (e) {
            assert.ok(sec.error, `FAILED: ${sec.title}\n\tunexpected error ${e}`);
        }
    }
}
