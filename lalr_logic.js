// Create a string representation of an item, completely ignoring its lookahead
function getCoreString(item) {
    return `${item.nt} -> ${item.prod.join(' ')} [dot: ${item.dot}]`;
}

// Compares two CLR1 states to see if they share the exact same core items
function haveSameCores(state1, state2) {
    // Extract all unique cores from state 1
    let cores1 = new Set();
    for(let item of state1) {
        cores1.add(getCoreString(item));
    }

    // Extract all unique cores from state 2
    let cores2 = new Set();
    for(let item of state2) {
        cores2.add(getCoreString(item));
    }

    // If they don't have same number of unique cores, they aren't twins
    if(cores1.size !== cores2.size) {
        return false;
    }

    // Check if every core in state 1 exists perfectly in state 2
    for(let core of cores1) {
        if(!cores2.has(core)) {
            return false;
        }
    }

    return true;
}

function buildLALRDFA(clrDFA) {
    let lalrStates = [];
    let stateMapping = {}; // This dictionary maps old CLR state IDs to new LALR state IDs
    let lalrTransitions = [];

    // Compress the states
    for(let i=0;i < clrDFA.states.length ; i++) {
        let clrState = clrDFA.states[i];

        // Check for exact cores
        let matchIndex = lalrStates.findIndex(ls => haveSameCores(ls, clrState));

        if(matchIndex !== -1) {
            // Map the old CLR state ID to this merged LALR state ID
            stateMapping[i] = matchIndex;

            // Merge the items to combine the lookaheads
            for(let item of clrState) {
                // We reuse your CLR helper to prevent duplicate items
                if(!containsCLRItem(lalrStates[matchIndex], item)) {
                    lalrStates[matchIndex].push(item);
                }
            }
        }
        else {
            // Deep copy the state so we don't accidentally mutate the original CLR data
            lalrStates.push(JSON.parse(JSON.stringify(clrState)));

            // Map the old ID to this brand new ID
            stateMapping[i] = lalrStates.length - 1; 
        }
    }

    // Rewire the transitions
    for(let t of clrDFA.transitions) {
        // Look up where the transitions should point to now
        let newFrom = stateMapping[t.from];
        let newTo = stateMapping[t.to];

        // Because we merged states, we might get duplicate arrows. Filter them out
        let transitionsExists = lalrTransitions.some(
            existing => existing.from === newFrom &&
            existing.symbol === t.symbol &&
            existing.to === newTo
        );

        if(!transitionsExists) {
            lalrTransitions.push({
                from: newFrom,
                symbol: t.symbol,
                to: newTo
            });
        }
    }

    return { states: lalrStates, transitions: lalrTransitions };
}