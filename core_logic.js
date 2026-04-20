function parseGrammarInput(rawText) {
    const grammar = {};
    
    // Split the input into individual lines, ignoring empty ones
    const lines = rawText.split('\n').filter(line => line.trim() !== '');

    lines.forEach(line => {
        // Split Left Hand Side (LHS) and Right Hand Side (RHS)
        const parts = line.split('->');
        if (parts.length !== 2) return; // Skip invalid lines

        const lhs = parts[0].trim();
        const rhs = parts[1].trim();

        // Split the RHS by the OR operator "|"
        const productions = rhs.split('|');

        // Tokenize each production rule by spaces
        const tokenizedRules = productions.map(rule => {
            let tokens = rule.trim().split(/\s+/); // Splits by one or more spaces

            return tokens.map(token => (token === 'e' || token === "''" || token === 'epsilon') ? 'ε' : token);
        });

        // Add to our main grammar object
        grammar[lhs] = tokenizedRules;
    });

    return grammar;
}

/**
 * Detects and eliminates Direct Left Recursion from the grammar.
 * Transforms A -> A alpha | beta into A -> beta A' and A' -> alpha A' | ε
 */
function eliminateLeftRecursion(grammar) {
    let newGrammar = {};

    for (let nt in grammar) {
        let rules = grammar[nt];
        let recursiveAlphas = [];
        let nonRecursiveBetas = [];

        // Separate the rules into recursive and non-recursive
        for (let rule of rules) {
            if (rule[0] === nt) {
                // We extract 'alpha' by slicing off the first token
                recursiveAlphas.push(rule.slice(1)); 
            } else {
                // It is a base case (beta)
                nonRecursiveBetas.push(rule);
            }
        }

        // Check if transformation is needed
        if (recursiveAlphas.length === 0) {
            // No recursion detected for this Non-Terminal, copy it as-is
            newGrammar[nt] = rules;
        } else {
            // Left Recursion found
            let ntPrime = nt + "'"; // Create the new Non-Terminal (e.g., E')
            
            let newRulesForNt = [];
            let newRulesForNtPrime = [];

            // Create A -> beta A'
            if (nonRecursiveBetas.length === 0) {
                 // Edge case: if there's no base case, standard compilation fails.
                 // We add a fallback to prevent crashing.
                 newRulesForNt.push([ntPrime]);
            } else {
                for (let beta of nonRecursiveBetas) {
                    if (beta.length === 1 && beta[0] === 'ε') {
                        newRulesForNt.push([ntPrime]); // ε A' is just A'
                    } else {
                        newRulesForNt.push([...beta, ntPrime]); 
                    }
                }
            }

            // Create A' -> alpha A' | ε
            for (let alpha of recursiveAlphas) {
                newRulesForNtPrime.push([...alpha, ntPrime]);
            }
            newRulesForNtPrime.push(["ε"]); // The terminating epsilon

            // Store the new rules
            newGrammar[nt] = newRulesForNt;
            newGrammar[ntPrime] = newRulesForNtPrime;
        }
    }

    return newGrammar;
}

/**
 * Detects and eliminates Left Factoring from the grammar.
 * Transforms A -> alpha beta1 | alpha beta2 into A -> alpha A' and A' -> beta1 | beta2
 */

function eliminateLeftFactoring(grammar) {
    // Deep copy the grammar to avoid mutating the original
    let newGrammar = JSON.parse(JSON.stringify(grammar)); 
    let changed = true;

    while (changed) {
        changed = false;
        let currentNonTerminals = Object.keys(newGrammar);

        for (let nt of currentNonTerminals) {
            let rules = newGrammar[nt];
            if (!rules || rules.length <= 1) continue; // Need at least 2 rules to factor

            // Group rules by their first token
            let groups = {};
            for (let rule of rules) {
                let firstToken = rule[0];
                if (!groups[firstToken]) groups[firstToken] = [];
                groups[firstToken].push(rule);
            }

            let factoredRules = [];
            let localChanged = false;

            // Check each group to see if they share a common prefix
            for (let token in groups) {
                let group = groups[token];
                
                if (group.length > 1) {
                    // We found multiple rules starting with the same token!
                    
                    // Find the LONGEST common prefix for this group
                    let prefix = [...group[0]]; 
                    for (let i = 1; i < group.length; i++) {
                        let currentRule = group[i];
                        let j = 0;
                        while (j < prefix.length && j < currentRule.length && prefix[j] === currentRule[j]) {
                            j++;
                        }
                        prefix = prefix.slice(0, j); // Shrink prefix to the matching part
                    }

                    // Create a unique new Non-Terminal (e.g., A'', A''')
                    let newNt = nt + "'"; 
                    while (newGrammar[newNt]) newNt += "'"; 

                    // Add the factored rule: A -> prefix A'
                    factoredRules.push([...prefix, newNt]);

                    // Create the remainder rules for A'
                    newGrammar[newNt] = [];
                    for (let rule of group) {
                        let remainder = rule.slice(prefix.length);
                        if (remainder.length === 0) {
                            newGrammar[newNt].push(["ε"]); // Exact match becomes epsilon
                        } else {
                            newGrammar[newNt].push(remainder);
                        }
                    }
                    
                    localChanged = true;
                    changed = true;
                } else {
                    // No common prefix for this token, keep rule as is
                    factoredRules.push(group[0]);
                }
            }

            // Update the grammar if we made changes
            if (localChanged) {
                newGrammar[nt] = factoredRules;
            }
        }
    }
    
    return newGrammar;
}

/**
 * Computes the First sets for all non-terminals in the grammar.
 * Uses fixed-point iteration to prevent infinite loops.
 */
function computeFirstSets(grammar) {
    let firstSets = {};
    
    // Helper function: If it's a key in the grammar, it's a Non-Terminal
    let isNonTerminal = (symbol) => grammar.hasOwnProperty(symbol);

    // Initialize empty sets for every Non-Terminal
    for (let nt in grammar) {
        firstSets[nt] = new Set();
    }

    let changed = true;
    
    // Loop until no new items are added to any set
    while (changed) {
        changed = false; // Assume nothing will change this round

        for (let nt in grammar) {
            let rules = grammar[nt];
            
            for (let rule of rules) {
                let i = 0;
                let continueToNextSymbol = true;

                // Walk through each token in the current rule
                while (continueToNextSymbol && i < rule.length) {
                    let symbol = rule[i];
                    continueToNextSymbol = false; // Stop looking ahead unless we hit epsilon
                    
                    if (!isNonTerminal(symbol)) {
                        // CASE A: It's a Terminal or 'ε'
                        if (!firstSets[nt].has(symbol)) {
                            firstSets[nt].add(symbol);
                            changed = true;
                        }
                    } else {
                        // CASE B: It's a Non-Terminal
                        // Add everything from First(symbol) EXCEPT epsilon
                        for (let firstOfSym of firstSets[symbol]) {
                            if (firstOfSym !== 'ε' && !firstSets[nt].has(firstOfSym)) {
                                firstSets[nt].add(firstOfSym);
                                changed = true;
                            }
                        }
                        
                        // If this Non-Terminal can be epsilon, we MUST look at the next symbol
                        if (firstSets[symbol].has('ε')) {
                            continueToNextSymbol = true;
                        }
                    }
                    i++;
                }

                // If we reached the end of the rule and EVERY symbol could be epsilon
                if (continueToNextSymbol) {
                    if (!firstSets[nt].has('ε')) {
                        firstSets[nt].add('ε');
                        changed = true;
                    }
                }
            }
        }
    }
    
    return firstSets;
}

/**
 * Helper to get the First set of a sequence of tokens (beta).
 */
function getFirstOfSequence(sequence, firstSets, grammar) {
    let result = new Set();
    
    // If sequence is empty, it's effectively epsilon
    if (sequence.length === 0) {
        result.add('ε');
        return result;
    }

    let allCanBeEmpty = true;
    for (let token of sequence) {
        if (!grammar.hasOwnProperty(token)) {
            // It's a terminal
            result.add(token);
            allCanBeEmpty = false;
            break;
        } else {
            // It's a non-terminal
            for (let val of firstSets[token]) {
                if (val !== 'ε') result.add(val);
            }
            // If this non-terminal cannot vanish, stop checking the sequence
            if (!firstSets[token].has('ε')) {
                allCanBeEmpty = false;
                break;
            }
        }
    }
    
    if (allCanBeEmpty) result.add('ε');
    return result;
}

/**
 * Computes the Follow sets for all non-terminals.
 * Requires the grammar and the already computed First sets.
 */
function computeFollowSets(grammar, firstSets) {
    let followSets = {};
    let startSymbol = Object.keys(grammar)[0];

    // Initialize empty sets for all NTs
    for (let nt in grammar) {
        followSets[nt] = new Set();
    }

    // Add '$' to the start symbol
    followSets[startSymbol].add('$');

    let changed = true;
    
    // Loop until no new items are added to ANY set
    while (changed) {
        changed = false;

        for (let nt in grammar) {
            for (let rule of grammar[nt]) {
                
                // Walk through every symbol in the current rule
                for (let i = 0; i < rule.length; i++) {
                    let symbol = rule[i];

                    // We only care about calculating FOLLOW sets for Non-Terminals
                    if (grammar.hasOwnProperty(symbol)) {
                        let nextFirsts = new Set();
                        let allNextCanBeEpsilon = true;

                        // Look at the remaining symbols to the right of 'symbol'
                        for (let j = i + 1; j < rule.length; j++) {
                            let nextSymbol = rule[j];
                            
                            if (!grammar.hasOwnProperty(nextSymbol)) {
                                // It's a terminal
                                nextFirsts.add(nextSymbol);
                                allNextCanBeEpsilon = false;
                                break;
                            } else {
                                // It's a non-terminal (Add FIRST(nextSymbol) except ε)
                                for (let f of firstSets[nextSymbol]) {
                                    if (f !== 'ε') nextFirsts.add(f);
                                }
                                if (!firstSets[nextSymbol].has('ε')) {
                                    allNextCanBeEpsilon = false;
                                    break;
                                }
                            }
                        }

                        // Add everything we found to the FOLLOW set of 'symbol'
                        let beforeSize = followSets[symbol].size;
                        for (let f of nextFirsts) {
                            followSets[symbol].add(f);
                        }

                        // If 'symbol' is at the end of the rule (or everything after it can be ε),
                        // add the FOLLOW set of the parent 'nt' to this 'symbol'
                        if (allNextCanBeEpsilon) {
                            for (let f of followSets[nt]) {
                                followSets[symbol].add(f);
                            }
                        }

                        if (followSets[symbol].size > beforeSize) {
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    return followSets;
}

/**
 * Generates the LL(1) Parsing Table.
 * Maps M[NonTerminal][Terminal] = Rule to apply.
 */
function generateLL1Table(grammar, firstSets, followSets) {
    let table = {};
    let conflicts = [];

    // 1. Initialize an empty table for every Non-Terminal
    for (let nt in grammar) {
        table[nt] = {};
    }

    // 2. Helper to get the FIRST set of an entire rule array (e.g., ['T', 'X'])
    function getFirstOfRule(rule) {
        let result = new Set();
        let allCanBeEmpty = true;
        
        for (let symbol of rule) {
            if (!grammar.hasOwnProperty(symbol)) { 
                // It's a terminal or ε
                result.add(symbol);
                allCanBeEmpty = false;
                break;
            } else { 
                // It's a non-terminal
                for (let f of firstSets[symbol]) {
                    if (f !== 'ε') result.add(f);
                }
                if (!firstSets[symbol].has('ε')) {
                    allCanBeEmpty = false;
                    break;
                }
            }
        }
        if (allCanBeEmpty) result.add('ε');
        return result;
    }

    // 3. Populate the Table
    for (let nt in grammar) {
        for (let rule of grammar[nt]) {
            let ruleFirsts = getFirstOfRule(rule);

            // RULE A: Put the production under every terminal in its FIRST set
            for (let term of ruleFirsts) {
                if (term !== 'ε') {
                    if (table[nt][term]) conflicts.push(`Conflict at [${nt}][${term}]`);
                    table[nt][term] = rule;
                }
            }

            // RULE B: If the rule can vanish (ε), put it under every terminal in the FOLLOW set
            if (ruleFirsts.has('ε')) {
                for (let followTerm of followSets[nt]) {
                    if (table[nt][followTerm]) conflicts.push(`Conflict at [${nt}][${followTerm}]`);
                    table[nt][followTerm] = rule;
                }
            }
        }
    }

    return { table, conflicts };
}

/**
 * Converts the Grammar JSON object into an HTML <table> string
 */
function generateGrammarTableHTML(grammar) {
    let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; color: #4caf50; border: 1px solid #4caf50; margin-bottom: 20px;">`;
    
    // Header Row
    html += `<thead><tr>`;
    html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1); width: 20%; text-align: center;">Non-Terminal</th>`;
    html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1);">Productions</th>`;
    html += `</tr></thead><tbody>`;

    // Data Rows
    for (let nt in grammar) {
        html += `<tr>`;
        // LHS
        html += `<td style="border: 1px solid #4caf50; padding: 10px; font-weight: bold; text-align: center;">${nt}</td>`;
        
        // RHS - join individual tokens with spaces, and multiple rules with ' | '
        let rulesStrings = grammar[nt].map(rule => rule.join(' '));
        let rhs = rulesStrings.join(' <strong style="color: #fff;">|</strong> '); 
        
        html += `<td style="border: 1px solid #4caf50; padding: 10px;">&rarr; ${rhs}</td>`;
        html += `</tr>`;
    }
    
    html += `</tbody></table>`;
    return html;
}

/**
 * Simulates the LL(1) parsing process and generates Tree Nodes for Vis.js
 */
function simulateParsing(parsingTable, startSymbol, followSets, inputString) {
    let inputTokens = inputString.split(/\s+/).filter(t => t !== '');
    //inputTokens.push('$');
    
    let trace = [];
    let isAccepted = true;
    let pointer = 0;

    // Tree Data Structures
    let nodes = [];
    let edges = [];
    let nodeIdCounter = 1;

    // Create the Root Node
    nodes.push({ id: nodeIdCounter, label: startSymbol });
    
    // Stack now holds objects to track the tree structure
    let stack = ['$', { symbol: startSymbol, id: nodeIdCounter }];

    while (stack.length > 0) {
        let topObj = stack[stack.length - 1];
        let topSymbol = (typeof topObj === 'string') ? topObj : topObj.symbol;
        let currentToken = inputTokens[pointer] || '$';

        // Convert object stack back to simple strings for the UI trace table
        let stackStr = stack.map(item => (typeof item === 'string') ? item : item.symbol).join(' ');

        let currentStep = { stack: stackStr, input: inputTokens.slice(pointer).join(' '), action: "", isError: false };

        if (topSymbol === currentToken) {
            currentStep.action = (topSymbol === '$') ? "Accept! String is valid." : `Match '${topSymbol}'`;
            stack.pop();
            pointer++;
        } 
        else if (parsingTable[topSymbol]) {
            let rule = parsingTable[topSymbol][currentToken];

            if (rule) {
                let parentId = topObj.id; // Remember who we are expanding
                stack.pop(); 
                currentStep.action = `${topSymbol} → ${rule.join(' ')}`;
                
                // Create Children Nodes and Edges
                let childrenForStack = [];
                for (let token of rule) {
                    nodeIdCounter++;
                    nodes.push({ id: nodeIdCounter, label: token });
                    edges.push({ from: parentId, to: nodeIdCounter }); // Connect Parent to Child
                    
                    if (token !== 'ε') {
                        childrenForStack.push({ symbol: token, id: nodeIdCounter });
                    }
                }

                // Push children to stack in REVERSE order
                for (let i = childrenForStack.length - 1; i >= 0; i--) {
                    stack.push(childrenForStack[i]);
                }

            } else {
                // Panic Mode
                isAccepted = false;
                currentStep.isError = true;
                if (followSets[topSymbol] && followSets[topSymbol].has(currentToken)) {
                    currentStep.action = `Error: Missing '${topSymbol}'. Popping stack.`;
                    stack.pop();
                } else {
                    currentStep.action = `Error: Unexpected '${currentToken}'. Skipping.`;
                    pointer++;
                }
            }
        } 
        else {
            isAccepted = false;
            currentStep.isError = true;
            currentStep.action = `Error: Expected '${topSymbol}' but found '${currentToken}'.`;
            stack.pop();
        }

        trace.push(currentStep);
        if (trace.length > 1000) break; // Safety loop break
    }

    // Return the treeData alongside the trace
    return { trace, isAccepted, treeData: { nodes, edges } };
}

//const structuredGrammar = parseGrammarInput(testInput);
//console.log(JSON.stringify(structuredGrammar, null, 2));