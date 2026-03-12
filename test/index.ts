import * as fs from 'fs';
import { document } from '../src/index.js';
import assert from 'assert';
import type { Document } from '../src/classes.js';

class Section {
    title: string;
    objectscript: string;
    structure: string;
    error: boolean;

    constructor(
        title: string,
        objectscript: string,
        structure: string,
        error: boolean,
    ) {
        this.title = title;
        this.objectscript = objectscript;
        this.structure = structure;
        this.error = error;
    }
}

class Suite {
    content: Section[];
    constructor(string: string) {
        this.content = [];
        let lines = string.split('\n');
        let line: string | undefined;
        line = lines.shift();
        console.assert(
            line?.startsWith('==='),
            `This line should be the first "===" but it is ${line}`,
        );
        while (true) {
            const title = lines.shift() as string;
            const errorOrCut = lines.shift() as string;
            const error = !errorOrCut.startsWith('===');
            if (error) {
                line = lines.shift();
                console.assert(
                    line?.startsWith('==='),
                    `This line should be "===" but it is ${line} (title = ${title})`,
                );
            }
            const objectscript = [];
            line = lines.shift();
            while (line !== undefined && !line.startsWith('---')) {
                objectscript.push(line);
                line = lines.shift();
            }
            const structure = [];
            line = lines.shift();
            while (line !== undefined && !line.startsWith('===')) {
                structure.push(line);
                line = lines.shift();
            }
            if (line === undefined) {
                break;
            }
            this.content.push(
                new Section(
                    title,
                    objectscript.join('\n'),
                    structure.join('\n'),
                    error,
                ),
            );
        }
    }
}

// List of tests that detect semantic errors rather than syntactic ones
const semanticErrors = [
    'invalid - ClientDataType unknown rhs',
    'invalid - ClassType unknown rhs',
    'invalid - ClassType multiple values',
    'invalid - DdlAllowed =',
    'invalid - Deprecated =',
    'invalid - Final =',
    'Sharded Invalid',
    'Sharded Invalid =',
    'Sharded Invalid Not',
    'invalid - Language = python (not allowed at class level)',
    'invalid - Language = ispl (not allowed at class level)',
    'invalid - Language unknown rhs',
    'invalid - LegacyInstanceContext =',
    'invalid - OdbcType unknown rhs',
    'invalid - OdbcType multiple values',
    'invalid - Owner contains @',
    'invalid - Owner contains *',
    'invalid - ServerOnly rhs not 0/1',
    'invalid - ServerOnly rhs is word',
    'invalid - SOAPBindingStyle unknown rhs',
    'invalid - SOAPBindingStyle multiple values',
    'invalid - SoapBodyUse unknown rhs',
    'invalid - SoapBodyUse multiple values',
    'invalid soapmessagename - quoted string instead of identifier',
    'invalid - ClientDataType rhs is a quoted string',
    'invalid - ClassType rhs is quoted non-empty',
    'invalid - ClientDataType rhs is a quoted string',
    'invalid - ClassType rhs is quoted non-empty',
    'invalid - Language rhs is quoted',
    'invalid - OdbcType rhs is quoted',
    'invalid - Owner rhs is quoted literal',
    'invalid - ServerOnly rhs is quoted',
    'invalid - SOAPBindingStyle rhs is quoted',
    'invalid - SoapBodyUse rhs is quoted',
    'invalid - SqlCategory unknown rhs',
    'invalid - SqlCategory rhs is quoted',
    'invalid - SqlCategory multiple values',
    'invalid - SqlRowIdName quoted string',
    'invalid - SqlRowIdName rhs contains punctuation (comma)',
    'invalid - SqlTableName quoted string',
    'invalid - SqlTableName rhs contains punctuation (comma)',
    'invalid - System rhs contains something not 0-4',
    'invalid - System rhs contains something not 0-4',
    'invalid - StorageStrategy rhs is quoted',
    'invalid - StorageStrategy multiple values',
    'invalid - WebMethod cannot take a value',
    'invalid - OnUpdate missing rhs',
    'invalid - OnUpdate rhs is quoted',
    'invalid soapmessagename - quoted string instead of identifier',
    'invalid class: bad Time value',
    'invalid class: bad Foreach value',
    'invalid - GenerateAfter value is a string literal (expects method name(s))',
    'invalid - GenerateAfter value is numeric',
    'invalid - Not must be separate word before WebMethod',
    'invalid - OnUpdate missing equals',
    'Invalid Index Name',
    'Invalid Index, No property expression',
    'Invalid Index, No property expression  after on',
    "INVALID: CoshardWith missing '='",
    'INVALID: CoshardWith value is a string literal (grammar expects identifier)',
    'INVALID: CoshardWith value wrapped in parentheses',
    'INVALID: trailing comma in index keywords list',
    'INVALID: missing CoshardWith value',
    'invalid soapaction - unquoted [ default ] (should be a single value)',
    'invalid soapaction - numeric literal value',
    'invalid soapmessagename - starts with a digit (not a valid XML identifier)',
    'invalid SoapRequestMessage - string literal (your grammar expects xml_identifier)',
    'invalid SoapRequestMessage - starts with a digit',
    'invalid_method_keyword_placeafter_empty_list',
    'invalid_method_keyword_placeafter_trailing_comma',
    'invalid_method_keyword_placeafter_non_identifier_value_number',
    'invalid - GenerateAfter empty parentheses',
    'invalid - GenerateAfter trailing comma inside parentheses',
    'invalid - GenerateAfter leading comma inside parentheses',
    'invalid - GenerateAfter list uses semicolons instead of commas',
    'InValid Parameter Keywords Placement',
    'InValid Parameter , Has As but no parameter type',
    'InValid Parameter , Has As and keywords but no parameter type',
    'InValid Parameter , Has = but no value',
    'InValid Parameter Keyword',
    'InValid Parameter Type',
    'InValid Parameter Keyword Flags',
    'InValid Parameter Type Placement',
    'invalid projection - missing projection class after As',
    'invalid projection - parentheses present but empty',
    'invalid projection - trailing comma in parameter list',
    'Invalid — missing As',
    'Invalid — List Of missing Of',
    'Invalid — Array Of missing type',
    'Invalid — missing closing ] on keywords',
    'Invalid — malformed parameter list (== not allowed)',
    'Invalid — SqlComputeOnChange missing value',
    'Invalid — SqlComputeCode missing {}',
    'Invalid — unknown property keyword',
];

const parseDocument = (input: string): Document | undefined => {
    return document.exec(input)[0]?.value;
};

// for (const file of fs.readdirSync(`./test/resource`)) {
//     const fileString = fs.readFileSync(`./test/resource/${file}`);
//     const suite = new Suite(fileString.toString());
//     for (const sec of suite.content) {
//         // if (sec.title != 'Valid Index: collection properties (KEYS/ELEMENTS)') {
//         //     continue;
//         // }
//         if (semanticErrors.includes(sec.title)) {
//             continue;
//         }
//         // if (sec.error) {
//         //     continue
//         // }
//         const doc = parseDocument(sec.objectscript);
//         console.assert(
//             sec.error === (doc === undefined),
//             'Should ' + (sec.error ? 'fail' : 'succeed') + ' ' + sec.title,
//         );
//         if (doc !== undefined) {
//             const roundtrip = doc.toString();
//             assert.deepStrictEqual(
//                 roundtrip.split('\n'),
//                 sec.objectscript.split('\n'),
//                 `FAILED: ${sec.title} - Source is not preserved`,
//             );
//         }
//     }
// }
