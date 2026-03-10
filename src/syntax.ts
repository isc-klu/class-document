export interface Location {
    line: number;
    char: number;
    absolute: number;
}

abstract class Node {
    begin: Location;
    end: Location;
    constructor(begin: Location, end: Location) {
        this.begin = begin
        this.end = end
    }
    abstract toString(): string;
}

class AtomicNode extends Node {
    content: string;
    constructor(begin: Location, end: Location, content: string) {
        super(begin, end)
        this.content = content
    }
    toString(): string {
        return this.content;
    }
}


