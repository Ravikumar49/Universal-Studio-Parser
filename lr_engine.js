//Constructor to store the the information about LR(0) item
class LR0Item {
    constructor(lhs, rhs, dotIndex) {
        this.lhs = lhs;
        this.rhs= rhs;
        this.dotIndex = dotIndex;
    }

    //Returns true if the dot is at the very end of the rhs array
    isReduceItem() {
        return this.rhs.length === this.dotIndex;
    }


    //Returns the symbol immediately after the dot (or null if at the end)
    getSymbolAfterDot() {
        // Check if we are NOT at the end
        if(!this.isReduceItem()) {
            let symbolAfterDot = this.rhs[this.dotIndex];
            return symbolAfterDot;
        }
        // Return null if we are at the end
        return null;
    }


    toString(){
        //We need to insert the "." into the RHS array just for printing.
        let beforeDot = this.rhs.slice(0, this.dotIndex);
        let afterDot = this.rhs.slice(this.dotIndex);

        //Now combine them with "." in middle
        let arrayWithDot = [...beforeDot, ".", ...afterDot];

        //Join the array into a single string with spaces
        let rightSide = arrayWithDot.join(" ");

        return `${this.lhs}->${rightSide}`;
    }
}


function closure(items, grammar) {
    //Create a queue starting with the initial items we are given
    let queue = [...items];

    //Create an array to hold the final results
    let closureSet = [...items];

    //We will be using sets to keep track of Non-terminals we have already processed to prevent infinite loops
    let processed = new Set();

    while(queue.length > 0) {
        let current = queue.shift();
        let symbol  = current.getSymbolAfterDot();
        //Check if that symbol is a Non-Terminal
        //And check if we haven't processed it yet
        if(grammar[symbol] && !processed.has(symbol)) {
            processed.add(symbol);

            for(let rule of grammar[symbol]) {
                let leftSide = symbol;
                let rightSide = rule;
                let dotPosition = 0;

                let item = new LR0Item(leftSide, rightSide, dotPosition);

                closureSet.push(item);
                queue.push(item);
            }
        }
    }

    return closureSet;
}


function goto(stateItems, symbol, grammar) {
    let movedItems = [];

    for(let item of stateItems) {
        //Check if the symbol right after the dot matches the symbol we are moving on.
        if(symbol === item.getSymbolAfterDot()) {
            let leftSide = item.lhs;
            let rightSide = item.rhs;
            let dotIndex = item.dotIndex;
            let newItem = new LR0Item(leftSide, rightSide, dotIndex+1);
            movedItems.push(newItem);
        }
    }
    return closure(movedItems, grammar);
}

function hashItems(items) {
    let stringArray = items.map(item => item.toString());
    stringArray.sort(); // Alphabetical sort
    return stringArray.join(" | ");
}


function generateLR0DFA(grammar, startSymbol) {
    //Augmented grammar
    let augmented = startSymbol + "'";
    grammar[augmented] = [[startSymbol]];

    //Creating State 0
    let initialItem = new LR0Item(augmented, [startSymbol], 0);
    let state0Item = closure([initialItem], grammar);
    let state0Hash = hashItems(state0Item);

    //Setting up the state graph and queue
    let dfaStates = {};
    let stateCounter = 0;

    //State object Structure
    dfaStates[state0Hash] = {
        id: stateCounter++,
        items: state0Item,
        transitions: {}
    };

    let queue = [state0Hash];

    while(queue.length > 0) {
        let currentHash = queue.shift();
        let currentState = dfaStates[currentHash];
        // We need to know all the possible symbols we can transition on from this state.
        let possibleSymbols = new Set();


        for(let item of currentState.items) {
            let symbol = item.getSymbolAfterDot();
            if(symbol!==null) {
                possibleSymbols.add(symbol);
            }
        }

        for(let symbol of possibleSymbols) {
            //Calculate new state items using goto
            let newItems = goto(currentState.items, symbol, grammar);

            //Maintain a hash for this new array of items
            let newHash = hashItems(newItems);

            //Check if it exists already or not
            if(!dfaStates[newHash]) {
                dfaStates[newHash] = {
                    id: stateCounter++,
                    items: newItems,
                    transitions: {}
                };
                queue.push(newHash);
            }
            //Record the transition
            currentState.transitions[symbol] = dfaStates[newHash].id;
        }
    }

    return dfaStates;
}

function getSymbols(grammar, startSymbol) {
    let terminals = new Set();
    let nonTerminals = new Set();

    // We add '$' symbol
    terminals.add("$");

    let augmentedStart = startSymbol + "'";

    // Loop through every Non-terminal in the grammar
    for(let lhs in grammar) {
        if(lhs!==augmentedStart) {
            nonTerminals.add(lhs);
        }

        // Loop through all the rules for this LHS
        for(let rule of grammar[lhs]) {
            // Loop through every token in the current rule
            for(let token of rule) {
                if(!grammar[token]) {
                    terminals.add(token);
                }
            }
        }

    }

    // Convert Sets back to Arrays so for easier traversing
    return {
        terminals: Array.from(terminals),
        nonTerminals: Array.from(nonTerminals)
    };
}

function generateLR0Table(dfaStates, grammar, startSymbol) {
    let { terminals, nonTerminals } = getSymbols(grammar, startSymbol);
    let table = {};
    let augmentedStart = startSymbol + "'";

    // Loop through every state in our DFA
    for(let stateId in dfaStates) {
        let state = dfaStates[stateId];

        // Setup empty row for this state
        table[state.id] = { ACTION: {}, GOTO: {}};

        // Fill the SHIFT and GOTO entries using the transitions we already calculated
        for(let symbol in state.transitions) {
            let nextState = state.transitions[symbol];

            if(terminals.includes(symbol)) {
                // If it's a terminal then it's a SHIFT
                table[state.id].ACTION[symbol] = "S" + nextState;
            }
            else if(nonTerminals.includes(symbol)) {
                // If it's a non-terminal then it's a GOTO
                table[state.id].GOTO[symbol] = nextState;
            }
        }

        // Fill the REDUCE and ACCEPT entries by looking at the items
            for(let item of state.items) {
                // Check if the is dot at the very end
                if(item.isReduceItem()) {
                    // ACCEPT CASE
                    if(item.lhs === augmentedStart) {
                        table[state.id].ACTION["$"] = "Accept";
                    }
                    // REDUCE CASE
                    else {
                        // We need to format the rule as a string so the parser knows what to reduce
                        let rulesString = `${item.lhs} -> ${item.rhs.join(" ")}`;

                        // When we reduce, we put the reduce instruction in every terminal column for this state
                        for(let term of terminals) {
                            // Prevent overwriting Shift/Accept with Reduce
                            if (!table[state.id].ACTION[term]) {
                                table[state.id].ACTION[term] = "R: " + rulesString;
                            } else {
                                // If a Shift already exists, we have a Shift/Reduce conflict
                                table[state.id].ACTION[term] += " | R: " + rulesString;
                            }
                        }
                    }
                }
            }
    }
    return { table, terminals, nonTerminals};
}

function simulateLR0Parsing(inputString, parsingTableData) {
    let { table } = parsingTableData;
    
    // Clean up the input string and add the End-of-Input symbol '$'
    let inputTokens = inputString.trim().split(/\s+/);
    if (inputTokens[0] === "") inputTokens = []; // Handle empty input
    //inputTokens.push("$");

    // The LR(0) Stack always starts with State 0
    let stack = [0];
    let trace = [];
    let isAccepted = false;

    // Safety counter to prevent infinite loops during testing
    let stepCount = 0; 
    let maxSteps = 1000;

    // TREE DATA SETUP
    let nodeIdCounter = 1;
    let treeNodes = [];
    let treeEdges = [];
    let treeStack = []; // Stores the IDs of the nodes waiting to be attached to a parent


    while (stepCount < maxSteps) {
        stepCount++;

        let currentState = stack[stack.length - 1];
        let currentToken = inputTokens[0];
        
        // Look up the action in our generated table
        let fullAction = table[currentState].ACTION[currentToken];

        // Record this exact moment in history for our UI table
        trace.push({
            stack: [...stack], // Make a copy of the stack
            input: [...inputTokens], // Make a copy of the input
            action: fullAction || "ERROR"
        });

        // Error Case: The table cell is empty!
        if (!fullAction) {
            break; // Stop parsing, the string is invalid
        }

        // Accept Case
        if (fullAction === "Accept") {
            isAccepted = true;
            break;
        }

        let action = fullAction.split(" | ")[0];

        // Shift Case: Starts with "S"
        if (action.startsWith("S")) {
            // TREE SHIFT
            let leafId = nodeIdCounter++;
            // Make terminals look like little yellow boxes
            treeNodes.push({ id: leafId, label: currentToken, shape: 'box', color: '#ffeb3b' }); 
            treeStack.push(leafId); // Put it on the waiting list!
            // -----------------------


            let state = parseInt(action.substring(1));
            stack.push(currentToken, state);
            inputTokens.shift();
        } 
        
        // Reduce Case: Starts with "R:"
        else if (action.startsWith("R:")) {
            let ruleString = action.substring(3);
            let splitRule = ruleString.split(" -> ");
            let lhs = splitRule[0];
            
            // If the RHS is empty (epsilon), length is 0. Otherwise, count the tokens.
            let rhsTokens = splitRule[1] === "" ? [] : splitRule[1].split(" ");
            let popCount = rhsTokens.length * 2;

            for (let i = 0; i < popCount; i++) {
                stack.pop();
            }

            // TREE REDUCE
            let parentId = nodeIdCounter++;
            // Make non-terminals look like green circles
            treeNodes.push({ id: parentId, label: lhs, shape: 'circle', color: '#e8f5e9' }); 

            // Grab the children off the waiting list (we unshift to keep them in Left-to-Right order!)
            let childrenIds = [];
            for (let i = 0; i < rhsTokens.length; i++) {
                childrenIds.unshift(treeStack.pop()); 
            }

            // Draw lines from the new parent to the children
            for (let childId of childrenIds) {
                treeEdges.push({ from: parentId, to: childId });
            }

            // The parent is now a complete branch, put it back on the waiting list!
            treeStack.push(parentId);
            // ------------------------

            let exposedState = stack[stack.length - 1];
            let gotoState = table[exposedState].GOTO[lhs];
            
            // If there is no GOTO defined, we have a syntax error
            if (gotoState === undefined) {
                trace.push({
                    stack: [...stack],
                    input: [...inputTokens],
                    action: `GOTO ERROR: No transition for ${lhs} in State ${exposedState}`
                });
                break;
            }

            stack.push(lhs, gotoState);
        }
    }

    return { trace, isAccepted, treeData: { nodes: treeNodes, edges: treeEdges } };
}

function generateSLR1Table(dfaStates, grammar, startSymbol) {
    let { terminals, nonTerminals } = getSymbols(grammar, startSymbol);
    let table = {};
    let augmentedStart = startSymbol + "'";

    let firsSets = computeFirstSets(grammar);
    let followSets = computeFollowSets(grammar, firsSets);

    

    for(let stateId in dfaStates) {
        let state = dfaStates[stateId];
        table[state.id] = {ACTION: {}, GOTO: {}};
        
        // Transitions
        for(let symbol in state.transitions) {
            nextState = state.transitions[symbol];

            // If the symbol is a terminal, it's a shift action
            if(terminals.includes(symbol)) {
                table[state.id].ACTION[symbol] = "S" + nextState;
            }
            // If the symbol is a non-terminal, it's a Goto action!
            else if(nonTerminals.includes(symbol)) {
                table[state.id].GOTO[symbol] = nextState;
            }
        }

        // Reduce Logic
        for(let item of state.items) {
            if(item.isReduceItem()) {
                //Accept case: We finished the ultimate master rule
                if(item.lhs===augmentedStart) {
                    table[state.id].ACTION["$"] = "Accept";
                }
                //Reduce case: We finished a normal rule
                else {
                    let rulesString = `${item.lhs} -> ${item.rhs.join(" ")}`;
                    // Grab the Follow set for the Left-Hand Side this specific term
                    let followOfLHS = followSets[item.lhs] || [];

                    // We only loop through the tokens allowed to follow the rule
                    for(let term of followOfLHS) {
                        // Prevent overwriting a Shift with a Reduce
                        if(!table[state.id].ACTION[term]) {
                            table[state.id].ACTION[term] = "R: " + rulesString;
                        }
                        else {
                            // If something is already there, we still log the conflict
                            table[state.id].ACTION[term] += " | R: " + rulesString;
                        }
                    }
                }
            }
        }
    }

    return { table, terminals, nonTerminals};
}