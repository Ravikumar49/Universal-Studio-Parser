// Helper function to get FIRST set of the sequence of the symbols
function getFirstOfSequence(sequence, firstSets) {
    let result = new Set();
    let allCanBeEmpty = true;

    for(let symbol of sequence) {
        let isTerminal = !firstSets.hasOwnProperty(symbol);

        if(isTerminal) {
            result.add(symbol);
            allCanBeEmpty = false;
            break;
        }
        else {
            for(let f of firstSets[symbol]) {
                if(f !== 'ε') result.add(f);
            }
            if(!firstSets[symbol].has('ε')) {
                allCanBeEmpty = false;
                break;
            }
        }
    }

    if(allCanBeEmpty) {
        result.add('ε');
    }

    return result;
}

function getCLRClosure(items, grammar, firstSets) {
    let closure = [...items];   // Start with the initial items
    let added = true;

    while(added) {
        added = false;
        for(let i=0;i<closure.length;i++) {
            let item = closure[i];

            // Get the symbols immediately after the dot
            let symbolAfterDot = item.prod[item.dot];

            // Check if the symbol is a Non-Terminal
            if(symbolAfterDot && grammar.hasOwnProperty(symbolAfterDot)) {
                // We need everything after the Non-Terminal to calculate look ahead
                let beta = item.prod.slice(item.dot + 1);

                // Combine beta with our current look ahead to form the sequence
                let sequence = [...beta, item.lookahead];

                // Get the valid look ahead for our new items
                let newLookaheads = getFirstOfSequence(sequence, firstSets);

                // Expand the non-terminal
                let rules = grammar[symbolAfterDot];
                for(let rule of rules) {
                    for(let la of newLookaheads) {
                        if(la === 'ε') continue; // Lookaheads are only actual terminals

                        // Create the newly expanded item
                        let newItem = {
                            nt: symbolAfterDot,
                            prod: rule,
                            dot: 0, // Dot always starts from 0 for new expressions
                            lookahead: la
                        };

                        // Add it if we don't already have it
                        if(!containsCLRItem(closure, newItem)) {
                            closure.push(newItem);
                            added = true;
                        }
                    }
                }
            }
        }
    }
    return closure;
}

function containsCLRItem(state, item) {
    return state.some(existing => 
        existing.nt === item.nt &&
        existing.dot === item.dot &&
        existing.lookahead === item.lookahead &&
        existing.prod.join(' ') === item.prod.join(' ')
    );
}

function getCLRGoto(state, symbol, grammar, firstSets) {
    let movedItems = [];

    // Look through every item in the current state
    for(let item of state) {
        let symbolAfterDot = item.prod[item.dot];

        // If the symbol after the dot matches the one we are reading
        if(symbolAfterDot === symbol) {
            // Shift the dot one space to the right
            movedItems.push({
                nt: item.nt,
                prod: item.prod,
                dot: item.dot + 1,
                lookahead: item.lookahead
            });
        }
    }

    // If no items could move past this symbol, this path is a dead end
    if(movedItems.length === 0) return null;

    // Run closure on the shifted items to generate the complete new state
    return getCLRClosure(movedItems, grammar, firstSets);
}

// Check if two entire CLR states are mathematically identical
function areCLRStatesEqual(state1, state2) {
    // If they don't have the same number of items, they aren't equal
    if(state1.length !== state2.length) return false;

    // Check if every single item is state1 exists perfectly in state2
    return state1.every(item => containsCLRItem(state2, item));
}

function buildCLRDFA(grammar, startSymbol, firstSets) {
    let states = [];  // Holds all our unique states
    let transitions = [];  // Holds the edges connecting them {from, symbol, to}

    // Create the Augmented Start Item
    let startItem = {
        nt: startSymbol + "'",
        prod: [startSymbol],
        dot: 0,
        lookahead: '$'
    };

    // Generate state 0
    let state0 = getCLRClosure([startItem], grammar, firstSets);
    states.push(state0);

    // We use a queue to keep track of which states we still need to explore
    let queue = [0];

    // Process every state until there are no new states left
    while(queue.length > 0) {
        let currentStateIndex = queue.shift();
        let currentState = states[currentStateIndex];

        // Find all symbols sitting immediately after a dot in the current state
        let symbolsToShift = new Set();
        for(let item of currentState) {
            if(item.dot < item.prod.length) {
                symbolsToShift.add(item.prod[item.dot]);
            }
        }

        // Calculate the GOTO for each of those symbols
        for(let symbol of symbolsToShift) {
            let nextState = getCLRGoto(currentState, symbol, grammar, firstSets);

            if(nextState !== null) {
                // Check if we've already discovered this exact state
                let existingStateIndex = states.findIndex(s => areCLRStatesEqual(s, nextState));

                if(existingStateIndex === -1) {
                    // It's a new state
                    states.push(nextState);
                    existingStateIndex = states.length - 1;
                    queue.push(existingStateIndex);
                }

                // Record the transition
                transitions.push({
                    from: currentStateIndex,
                    symbol: symbol,
                    to: existingStateIndex
                });
            }
        }
    }
    // Return the completed map of the parser
    return { states, transitions };
}

function buildCLRTable(grammar, dfa, startSymbol) {
    let table = [];
    let { states, transitions } = dfa;

    // Initialize an empty object for each state
    for (let i = 0; i < states.length; i++) {
        table.push({});
    }

    // Fill Shift and Goto moves from our transitions
    for (let t of transitions) {
        let isTerminal = !grammar.hasOwnProperty(t.symbol);
        
        if (isTerminal) {
            // Terminal -> Shift move
            table[t.from][t.symbol] = 'S' + t.to;
        } else {
            // Non-Terminal -> Goto move
            table[t.from][t.symbol] = t.to.toString();
        }
    }

    // Fill Reduce and Accept moves from our states
    let augmentedStart = startSymbol + "'";

    for (let i = 0; i < states.length; i++) {
        for (let item of states[i]) {
            
            // Check if the rule is ready to reduce
            let isAtEnd = (item.dot === item.prod.length) || (item.prod[0] === 'ε');

            if (isAtEnd) {
                if (item.nt === augmentedStart && item.lookahead === '$') {
                    // Accept
                    table[i]['$'] = 'Accept';
                } else {
                    // Reduce
                    let reduceAction = 'R: ' + item.nt + ' -> ' + item.prod.join(' ');

                    // Conflict Check (just in case the grammar is NOT CLR(1))
                    if (table[i][item.lookahead] && table[i][item.lookahead] !== reduceAction) {
                        table[i][item.lookahead] += ' / ' + reduceAction; // Mark the conflict
                    } else {
                        table[i][item.lookahead] = reduceAction;
                    }
                }
            }
        }
    }

    return table;
}