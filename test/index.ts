import * as fs from 'fs';
import { ClassDocument } from '../src/structure.js';

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
    // console.log(`Processing ${file}`)

    const fileString = fs.readFileSync(`./test/resource/${file}`);
    const suite = new Suite(fileString.toString());

    for (const sec of suite.content) {
        try {
            const _ = new ClassDocument(sec.objectscript);
            console.assert(!sec.error, `FAILED: ${sec.title}`);
        } catch (e) {
            console.assert(sec.error, `FAILED: ${sec.title}`);
        }
    }
}