export class ClassDocument {
    content: string;
    constructor(content: string) {
        this.content = content;
    }

    public toString(): string {
        return this.content;
    }
}
