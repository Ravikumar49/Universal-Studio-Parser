class SymbolTable {
    constructor() {
        // Acting like a hash map
        this.symbols = {};
    }

    // We need a method to declare new variables
    insert(name, type, value, lineNumber) {
        // Check if this variable already exists
        if(this.symbols[name]) {
            console.warn(`Variable '${name}' is already declared!`);
            return false;
        }
        // If symbol is new, save it's properties in our hash map
        this.symbols[name] = {
            type: type,
            value: value,
            line: lineNumber
        };

        console.log(`'${name} added to the Symbol Table`);
        return true;
    }

    // We need a method to fetch variables
    lookup(name) {
        // Check if that variable already exists
        if(!this.symbols[name]) {
            console.warn(`Error: Variable '${name} is not defined`);
            return null;
        }

        //If exists, return it's data
        return this.symbols[name];
    }

    updateValue(name, newValue) {
        if(!this.symbols[name]) {
            console.warn(`Error: Cannot update '${name}', it has not been declared`);
            return false;
        }
        this.symbols[name].value = newValue;
        console.log(`Symbol Table updated: ${name} is now ${newValue}`);
        return true;
    }

    getAllSymbols() {
        return this.symbols;
    }
}