// ==========================================
// 1. HELPER FUNCTIONS (HTML GENERATORS)
// ==========================================

function generateTableHTML(parsingTable) {
    let terminals = new Set();
    for (let nt in parsingTable) {
        for (let term in parsingTable[nt]) {
            terminals.add(term);
        }
    }
    
    let termArray = Array.from(terminals);
    if (termArray.includes('$')) {
        termArray = termArray.filter(t => t !== '$');
        termArray.push('$');
    }

    let html = `<table style="width: 100%; border-collapse: collapse; text-align: center; color: #4caf50; border: 1px solid #4caf50; margin-bottom: 20px;">`;
    html += `<thead><tr>`;
    html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1);">NT \\ Term</th>`;
    for (let t of termArray) {
        html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1);">${t}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let nt in parsingTable) {
        html += `<tr>`;
        html += `<td style="border: 1px solid #4caf50; padding: 10px; font-weight: bold;">${nt}</td>`;
        for (let t of termArray) {
            let rule = parsingTable[nt][t];
            if (rule) {
                html += `<td style="border: 1px solid #4caf50; padding: 10px;">${nt} &rarr; ${rule.join(' ')}</td>`;
            } else {
                html += `<td style="border: 1px solid #4caf50; padding: 10px;"></td>`; 
            }
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
}

function generateLR0StatesHTML(dfaStates) {
    let html = `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px;">`;

    // Extract the states from the object and sort them by ID (0, 1, 2...)
    let statesArray = Object.values(dfaStates).sort((a, b) => a.id - b.id);

    for (let state of statesArray) {
        // Draw the State Card
        html += `<div style="border: 1px solid #4caf50; padding: 15px; border-radius: 5px; background: rgba(76, 175, 80, 0.05); min-width: 220px;">`;
        html += `<h4 style="margin-top: 0; color: #4caf50; border-bottom: 1px solid #4caf50; padding-bottom: 5px;">State I${state.id}</h4>`;

        // 1. Print the Items
        html += `<ul style="list-style-type: none; padding-left: 0; margin-bottom: 10px; font-family: monospace; font-size: 14px; color: #e8f5e9;">`;
        for (let item of state.items) {
            html += `<li>${item.toString()}</li>`;
        }
        html += `</ul>`;

        // Check if this state contains the Accept item (LHS ends with ' and the dot is at the end)
        let isAcceptState = state.items.some(item => item.lhs.endsWith("'") && item.isReduceItem());
        if (isAcceptState) {
            html += `<div style="margin-bottom: 10px;">
                        <span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">ACCEPT STATE on $</span>
                     </div>`;
        }

        // 2. Print the Transitions
        let transitionKeys = Object.keys(state.transitions);
        if (transitionKeys.length > 0) {
            html += `<div style="font-size: 0.9em; border-top: 1px dashed #4caf50; padding-top: 8px;">`;
            html += `<strong style="color: #4caf50;">Transitions:</strong><br>`;
            for (let sym of transitionKeys) {
                // Creates a little badge for each transition
                html += `<span style="display: inline-block; background: #4caf50; color: white; padding: 3px 8px; border-radius: 3px; margin: 4px 4px 0 0; font-family: monospace;">${sym} &rarr; I${state.transitions[sym]}</span>`;
            }
            html += `</div>`;
        } else {
             html += `<div style="font-size: 0.9em; border-top: 1px dashed #4caf50; padding-top: 8px; color: #888;">No transitions (Reduce State)</div>`;
        }

        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

function generateLR0TableHTML(tableData) {
    let { table, terminals, nonTerminals } = tableData;
    let states = Object.keys(table).sort((a, b) => a - b);

    let html = `<div style="overflow-x: auto; margin-top: 20px;">`;
    html += `<table style="width: 100%; border-collapse: collapse; text-align: center; font-family: monospace; font-size: 14px; background: #2d2d2d; color: #e8f5e9;">`;
    
    // Header Row
    html += `<thead><tr style="background: #1e1e1e; border-bottom: 2px solid #4caf50;">`;
    html += `<th rowspan="2" style="border: 1px solid #444; padding: 10px;">State</th>`;
    html += `<th colspan="${terminals.length}" style="border: 1px solid #444; padding: 5px; color: #ff9800;">ACTION</th>`;
    html += `<th colspan="${nonTerminals.length}" style="border: 1px solid #444; padding: 5px; color: #03a9f4;">GOTO</th>`;
    html += `</tr><tr style="background: #1e1e1e;">`;
    
    // Column Headers
    terminals.forEach(t => html += `<th style="border: 1px solid #444; padding: 8px;">${t}</th>`);
    nonTerminals.forEach(nt => html += `<th style="border: 1px solid #444; padding: 8px;">${nt}</th>`);
    html += `</tr></thead><tbody>`;

    // Data Rows
    for (let stateId of states) {
        html += `<tr><td style="border: 1px solid #444; padding: 8px; font-weight: bold;">${stateId}</td>`;
        
        // Action columns
        for (let t of terminals) {
            let cell = table[stateId].ACTION[t] || "";
            // Color code conflicts red, Accept green, Shift yellow
            let color = cell.includes("|") ? "#f44336" : (cell === "Accept" ? "#4caf50" : (cell.startsWith("S") ? "#ffeb3b" : "#e8f5e9"));
            html += `<td style="border: 1px solid #444; padding: 8px; color: ${color};">${cell}</td>`;
        }
        
        // Goto columns
        for (let nt of nonTerminals) {
            let cell = table[stateId].GOTO[nt] || "";
            html += `<td style="border: 1px solid #444; padding: 8px; color: #03a9f4;">${cell}</td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

function generateCLRStatesHTML(dfa) {
    let html = `<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px;">`;
    
    for (let i = 0; i < dfa.states.length; i++) {
        let state = dfa.states[i];
        
        // Draw the State Card (Purple Theme)
        html += `<div style="border: 1px solid #9c27b0; padding: 15px; border-radius: 5px; background: rgba(156, 39, 176, 0.05); min-width: 220px;">`;
        html += `<h4 style="margin-top: 0; color: #ce93d8; border-bottom: 1px solid #9c27b0; padding-bottom: 5px;">State I${i}</h4>`;
        
        // 1. Print the CLR Items [A -> a . b, $]
        html += `<ul style="list-style-type: none; padding-left: 0; margin-bottom: 10px; font-family: monospace; font-size: 14px; color: #e8f5e9;">`;
        for (let item of state) {
            let prodStr = [...item.prod];
            prodStr.splice(item.dot, 0, "<strong style='color:#ff9800;'>&bull;</strong>"); // Insert the dot visually
            let itemText = `[${item.nt} &rarr; ${prodStr.join(' ')}, <span style='color:#03a9f4;'>${item.lookahead}</span>]`;
            html += `<li>${itemText}</li>`;
        }
        html += `</ul>`;
        
        // 2. Print the Transitions
        let stateTransitions = dfa.transitions.filter(t => t.from === i);
        if (stateTransitions.length > 0) {
            html += `<div style="font-size: 0.9em; border-top: 1px dashed #9c27b0; padding-top: 8px;">`;
            html += `<strong style="color: #ce93d8;">Transitions:</strong><br>`;
            for (let t of stateTransitions) {
                html += `<span style="display: inline-block; background: #9c27b0; color: white; padding: 3px 8px; border-radius: 3px; margin: 4px 4px 0 0; font-family: monospace;">${t.symbol} &rarr; I${t.to}</span>`;
            }
            html += `</div>`;
        } else {
             html += `<div style="font-size: 0.9em; border-top: 1px dashed #9c27b0; padding-top: 8px; color: #888;">No transitions (Reduce State)</div>`;
        }
        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

function generateCLRTableHTML(table, grammar) {
    let nonTerminals = Object.keys(grammar);
    let terminalsSet = new Set();
    
    // Extract terminals by looking at all symbols used in the table
    table.forEach(state => {
        Object.keys(state).forEach(sym => {
            if (!nonTerminals.includes(sym)) terminalsSet.add(sym);
        });
    });
    
    let terminals = Array.from(terminalsSet);
    if (terminals.includes('$')) {
        terminals = terminals.filter(t => t !== '$');
        terminals.push('$');
    }

    let html = `<div style="overflow-x: auto; margin-top: 20px;">`;
    html += `<table style="width: 100%; border-collapse: collapse; text-align: center; font-family: monospace; font-size: 14px; background: #2d2d2d; color: #e8f5e9;">`;
    
    // Header Row
    html += `<thead><tr style="background: #1e1e1e; border-bottom: 2px solid #9c27b0;">`;
    html += `<th rowspan="2" style="border: 1px solid #444; padding: 10px;">State</th>`;
    html += `<th colspan="${terminals.length}" style="border: 1px solid #444; padding: 5px; color: #ff9800;">ACTION</th>`;
    html += `<th colspan="${nonTerminals.length}" style="border: 1px solid #444; padding: 5px; color: #03a9f4;">GOTO</th>`;
    html += `</tr><tr style="background: #1e1e1e;">`;
    
    terminals.forEach(t => html += `<th style="border: 1px solid #444; padding: 8px;">${t}</th>`);
    nonTerminals.forEach(nt => html += `<th style="border: 1px solid #444; padding: 8px;">${nt}</th>`);
    html += `</tr></thead><tbody>`;

    // Data Rows
    for (let i = 0; i < table.length; i++) {
        html += `<tr><td style="border: 1px solid #444; padding: 8px; font-weight: bold;">${i}</td>`;
        
        // Action columns
        for (let t of terminals) {
            let cell = table[i][t] || "";
            let color = cell.includes("/") ? "#f44336" : (cell === "Accept" ? "#4caf50" : (cell.startsWith("S") ? "#ffeb3b" : "#e8f5e9"));
            html += `<td style="border: 1px solid #444; padding: 8px; color: ${color};">${cell}</td>`;
        }
        
        // Goto columns
        for (let nt of nonTerminals) {
            let cell = table[i][nt] || "";
            html += `<td style="border: 1px solid #444; padding: 8px; color: #03a9f4;">${cell}</td>`;
        }
        html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    return html;
}

function generateGrammarTableHTML(grammar) {
    let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; color: #4caf50; border: 1px solid #4caf50; margin-bottom: 20px;">`;
    html += `<thead><tr>`;
    html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1); width: 20%; text-align: center;">Non-Terminal</th>`;
    html += `<th style="border: 1px solid #4caf50; padding: 10px; background-color: rgba(76, 175, 80, 0.1);">Productions</th>`;
    html += `</tr></thead><tbody>`;

    for (let nt in grammar) {
        html += `<tr>`;
        html += `<td style="border: 1px solid #4caf50; padding: 10px; font-weight: bold; text-align: center;">${nt}</td>`;
        let rulesStrings = grammar[nt].map(rule => rule.join(' '));
        let rhs = rulesStrings.join(' <strong style="color: #fff;">|</strong> '); 
        html += `<td style="border: 1px solid #4caf50; padding: 10px;">&rarr; ${rhs}</td>`;
        html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
}

function generateSimulationHTML(trace, isAccepted) {
    let html = `<div style="overflow-x: auto; margin-top: 20px;">`;
    html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-family: monospace; font-size: 14px; background: #2d2d2d; color: #e8f5e9;">`;
    
    // Header
    html += `<thead><tr style="background: #1e1e1e; border-bottom: 2px solid #4caf50;">`;
    html += `<th style="border: 1px solid #444; padding: 10px;">Step</th>`;
    html += `<th style="border: 1px solid #444; padding: 10px;">Stack</th>`;
    html += `<th style="border: 1px solid #444; padding: 10px;">Input</th>`;
    html += `<th style="border: 1px solid #444; padding: 10px;">Action</th>`;
    html += `</tr></thead><tbody>`;

    // Data Rows
    trace.forEach((step, index) => {
        // Color code the action text
        let actionColor = step.action === "Accept" ? "#4caf50" : (step.action.includes("ERROR") ? "#f44336" : "#e8f5e9");
        
        html += `<tr>`;
        html += `<td style="border: 1px solid #444; padding: 8px;">${index + 1}</td>`;
        // Join the arrays with spaces so they look nice
        html += `<td style="border: 1px solid #444; padding: 8px;">[ ${step.stack.join(", ")} ]</td>`;
        html += `<td style="border: 1px solid #444; padding: 8px;">${step.input.join(" ")}</td>`;
        html += `<td style="border: 1px solid #444; padding: 8px; color: ${actionColor}; font-weight: bold;">${step.action}</td>`;
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    // Final Success/Fail Message
    if (isAccepted) {
        html += `<h3 style="color: #4caf50; text-align: center; margin-top: 20px;">String Accepted!</h3>`;
    } else {
        html += `<h3 style="color: #f44336; text-align: center; margin-top: 20px;">Syntax Error: String Rejected</h3>`;
    }

    return html;
}

function generateSymbolTableHTML(symTable) {
    let symbols = symTable.getAllSymbols();
    let keys = Object.keys(symbols);
    if (keys.length === 0) return ""; 

    let html = `<div style="margin-top: 20px;">
        <h3 style="color: #ff9800; border-bottom: 1px solid #ff9800; padding-bottom: 5px;">Symbol Table</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-family: monospace; font-size: 14px; background: #2d2d2d; color: #e8f5e9;">
        <thead><tr style="background: #1e1e1e; border-bottom: 2px solid #ff9800;">
            <th style="border: 1px solid #444; padding: 10px;">Variable (Lexeme)</th>
            <th style="border: 1px solid #444; padding: 10px;">Data Type</th>
            <th style="border: 1px solid #444; padding: 10px;">Current Value</th>
        </tr></thead><tbody>`;

    for (let name of keys) {
        let data = symbols[name];
        html += `<tr>
            <td style="border: 1px solid #444; padding: 8px; font-weight: bold; color: #ffeb3b;">${name}</td>
            <td style="border: 1px solid #444; padding: 8px;">${data.type}</td>
            <td style="border: 1px solid #444; padding: 8px;">${data.value}</td>
        </tr>`;
    }
    html += `</tbody></table></div>`;
    return html;
}

// Helper to universally check if ANY parsing table has conflicts
function getParserStatus(tableData) {
    // Convert the entire object to a string to safely search for the '/' conflict marker
    const tableString = JSON.stringify(tableData);
    
    if (tableString.includes('/') || tableString.includes('|')) {
        return "<span style='color: #ff4d4d; font-weight: bold;'>Failed (Conflicts)</span>";
    }
    return "<span style='color: #4caf50; font-weight: bold;'>Accepted</span>";
}

// ==========================================
// 2. MAIN APPLICATION CONTROLLER
// ==========================================

// Global variables so the two buttons can share data
let globalParsingTable = null;
let globalStartSymbol = null;
let globalFollowSets = null;

let currentMode = "LL1";
let cachedLR0TableData = null;

document.addEventListener('DOMContentLoaded', () => {
    const parseBtn = document.getElementById('parse-btn');
    const grammarInput = document.getElementById('grammar-input');
    const jsonOutput = document.getElementById('json-output');

    const simulateBtn = document.getElementById('simulate-btn');
    const stringInput = document.getElementById('string-input');
    const simulationOutput = document.getElementById('simulation-output');

    // --- LOGIC FOR GENERATING THE TABLE ---
    parseBtn.addEventListener('click', () => {
        const rawText = grammarInput.value;
        
        // Pipeline
        const rawGrammar = parseGrammarInput(rawText);
        const noRecursionGrammar = eliminateLeftRecursion(rawGrammar);
        const cleanGrammar = eliminateLeftFactoring(noRecursionGrammar);
        const firstSets = computeFirstSets(cleanGrammar);
        const followSets = computeFollowSets(cleanGrammar, firstSets);
        const { table, conflicts } = generateLL1Table(cleanGrammar, firstSets, followSets);

        // Save data globally for the Simulate button
        const nonTerminals = Object.keys(cleanGrammar);
        globalStartSymbol = nonTerminals.length > 0 ? nonTerminals[0] : null;
        globalParsingTable = table;
        globalFollowSets = followSets;

        currentMode = "LL1";

        // Output formatting
        let outputHTML = "=== OPTIMIZED GRAMMAR ===<br>";
        outputHTML += generateGrammarTableHTML(cleanGrammar);

        outputHTML += "=== LL(1) PARSING TABLE ===<br>";
        outputHTML += generateTableHTML(table);
        
        outputHTML += "=== CONFLICT REPORT ===<br>";
        if (conflicts.length === 0) {
            outputHTML += "<span style='color: #4caf50; font-weight: bold;'>No conflicts detected. Grammar IS LL(1).</span><br>";
        } else {
            outputHTML += "<span style='color: #ff4d4d; font-weight: bold;'>Grammar is NOT LL(1). Conflicts found:<br>";
            conflicts.forEach(c => outputHTML += "- " + c + "<br>");
            outputHTML += "</span>";
        }
                             
        jsonOutput.innerHTML = outputHTML;
    });

    // --- LOGIC FOR STACK SIMULATION & TREE ---
    simulateBtn.addEventListener('click', () => {
        // Grab the raw text the user has typed
        const rawInputString = stringInput.value;

        const tokenObjects = tokenizeInput(rawInputString);

        const symTable = new SymbolTable();
        let parserInputArray = [];

        // Sort the Lexemes and tokens
        for(let item of tokenObjects) {
            // Build the string parser needs
            parserInputArray.push(item.token);

            // If it's an 'ID', save the actual word
            if(item.token === 'id') {
                symTable.insert(item.lexeme, "float", 0.0, 1);
            }
        }

        const parserFriendlyString = parserInputArray.join(" ");
        console.log("FINAL SYMBOL TABLE");
        console.table(symTable.getAllSymbols());

        //const testString = stringInput.value;

        if (currentMode === "LR0" || currentMode === "SLR1" || currentMode === "CLR1" || currentMode === "LALR1") {
            // --- LR(0) SIMULATION MODE ---
            if (!cachedLR0TableData) {
                alert("Please generate the LR(0) DFA first!");
                return;
            }
            
            // Extract Tree Data
            const { trace, isAccepted, treeData } = simulateLR0Parsing(parserFriendlyString, cachedLR0TableData);

            // Print the Trace Table
            let traceHTML = generateSimulationHTML(trace, isAccepted);
            simulationOutput.innerHTML = traceHTML + generateSymbolTableHTML(symTable);

            // 3. Draw the Vis.js Tree
            const treeContainer = document.getElementById('tree-network');
            
            if (isAccepted) {
                const data = {
                    nodes: new vis.DataSet(treeData.nodes),
                    edges: new vis.DataSet(treeData.edges)
                };

                const options = {
                    layout: {
                        hierarchical: { direction: 'UD', sortMethod: 'directed', levelSeparation: 60, nodeSpacing: 50 }
                    },
                    physics: false, 
                    nodes: { font: { face: 'monospace', color: '#333' } },
                    edges: { color: '#aaa', arrows: { to: false } }
                };

                new vis.Network(treeContainer, data, options);
            } else {
                treeContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff4d4d; font-family: sans-serif; text-align: center; padding: 20px;">
                        <h3 style="margin-bottom: 10px;">Tree Generation Aborted</h3>
                        <p>The input string contains syntax errors.<br>A valid Parse Tree can only be generated for accepted strings.</p>
                    </div>
                `;
            }
        }
        else {
            // 1. Validation
            if (!globalParsingTable || !globalStartSymbol) {
                simulationOutput.innerHTML = "<span style='color: #ff4d4d; font-weight: bold;'>Please click 'Generate JSON' above first!</span>";
                return;
            }

            const inputString = stringInput.value.trim();
            
            // 2. Run the simulation
            const { trace, isAccepted, treeData } = simulateParsing(globalParsingTable, globalStartSymbol, globalFollowSets, parserFriendlyString);

            // 3. Build the HTML Table (The part that went missing!)
            let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-family: monospace; border: 1px solid #ddd;">`;
            html += `<thead style="background: #f4f4f9;"><tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">Step</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Stack</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Input</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Action</th>
                    </tr></thead><tbody>`;

            trace.forEach((step, index) => {
                let actionColor = step.isError ? "#ff4d4d" : (step.action.includes("Match") || step.action.includes("Accept") ? "#4caf50" : "#333");
                let rowStyle = step.isError ? "background-color: #ffe6e6;" : "";

                html += `<tr style="${rowStyle}">
                            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${step.stack}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${step.input}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; color: ${actionColor}; font-weight: bold;">${step.action}</td>
                        </tr>`;
            });
            html += `</tbody></table>`;

            if (isAccepted) {
                html += `<h3 style="color: #4caf50; margin-top: 20px;">Verdict: String Accepted!</h3>`;
            } else {
                html += `<h3 style="color: #ff4d4d; margin-top: 20px;">Verdict: String Rejected.</h3>`;
            }

            // Print the table to the left column
            simulationOutput.innerHTML = html + generateSymbolTableHTML(symTable);

            // 4. Draw the Vis.js Tree in the right column
            const treeContainer = document.getElementById('tree-network');
            
            if (isAccepted) {
                // ONLY draw the tree if the string is perfectly valid
                const data = {
                    nodes: new vis.DataSet(treeData.nodes),
                    edges: new vis.DataSet(treeData.edges)
                };

                const options = {
                    layout: {
                        hierarchical: {
                            direction: 'UD', 
                            sortMethod: 'directed',
                            levelSeparation: 60,
                            nodeSpacing: 50
                        }
                    },
                    physics: false, 
                    nodes: {
                        shape: 'circle',
                        color: { background: '#e8f5e9', border: '#4caf50' },
                        font: { face: 'monospace', color: '#333' }
                    },
                    edges: { color: '#aaa', arrows: { to: false } }
                };

                new vis.Network(treeContainer, data, options);
            } else {
                // If rejected, clear the canvas and show an error message
                treeContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff4d4d; font-family: sans-serif; text-align: center; padding: 20px;">
                        <h3 style="margin-bottom: 10px;">Tree Generation Aborted</h3>
                        <p>The input string contains syntax errors.<br>A valid Parse Tree can only be generated for accepted strings.</p>
                    </div>
                `;
            }
        }
    });

    const lr0Btn = document.getElementById('lr0-btn');
    const slr1Btn = document.getElementById('slr1-btn');
    const clrBtn = document.getElementById('clr-btn');
    const lalrBtn = document.getElementById('lalr-btn');
    const compBtn = document.getElementById('btn-compare');

    // --- LOGIC FOR LR(0) DFA GENERATOR ---
    lr0Btn.addEventListener('click', () => {
        const rawText = grammarInput.value;
        const rawGrammar = parseGrammarInput(rawText);
        
        // Deep copy the grammar because LR(0) modifies it by adding E' -> E
        const grammarCopy = JSON.parse(JSON.stringify(rawGrammar));
        
        // Find the start symbol (the first key in the grammar object)
        const startSymbol = Object.keys(grammarCopy)[0];

        if (!startSymbol) {
            jsonOutput.innerHTML = "<span style='color: red;'>Please enter a valid grammar.</span>";
            return;
        }

        const dfa = generateLR0DFA(grammarCopy, startSymbol);
        const parsingTableData = generateLR0Table(dfa, grammarCopy, startSymbol);

        cachedLR0TableData = parsingTableData;
        currentMode = "LR0";

        // Display the results
        let outputHTML = "=== LR(0) PARSING TABLE ===<br>";
        outputHTML += generateLR0TableHTML(parsingTableData);
        outputHTML += "<br><br>=== LR(0) STATE MACHINE ===<br>";
        outputHTML += generateLR0StatesHTML(dfa);
        
        

        jsonOutput.innerHTML = outputHTML;
    });

        slr1Btn.addEventListener('click', () => {
        const rawText = grammarInput.value;
        const rawGrammar = parseGrammarInput(rawText);
        const grammarCopy = JSON.parse(JSON.stringify(rawGrammar));
        const startSymbol = Object.keys(grammarCopy)[0];

        const dfa = generateLR0DFA(grammarCopy, startSymbol);
        
        // Call your new SLR1 function here!
        const parsingTableData = generateSLR1Table(dfa, grammarCopy, startSymbol);

        // Keep using "cachedLR0TableData" so your blue simulation button still works!
        cachedLR0TableData = parsingTableData; 
        currentMode = "SLR1"; 

        // Update the title so you know which one you are looking at
        let outputHTML = "=== SLR(1) PARSING TABLE ===<br>"; 
        outputHTML += generateLR0TableHTML(parsingTableData);
        outputHTML += "<br><br>=== LR(0) STATE MACHINE ===<br>";
        outputHTML += generateLR0StatesHTML(dfa);
        
        jsonOutput.innerHTML = outputHTML;
    });

    clrBtn.addEventListener('click', () => {
        const rawText = grammarInput.value;
        const rawGrammar = parseGrammarInput(rawText);
        
        // Deep copy the grammar
        const grammarCopy = JSON.parse(JSON.stringify(rawGrammar));
        const startSymbol = Object.keys(grammarCopy)[0];

        if (!startSymbol) {
            jsonOutput.innerHTML = "<span style='color: #ff4d4d;'>Please enter a valid grammar.</span>";
            return;
        }

        // Compute FIRST sets
        const firstSets = computeFirstSets(grammarCopy);
        
        // Build the CLR(1) DFA
        const dfa = buildCLRDFA(grammarCopy, startSymbol, firstSets);
        
        // Build the Parsing Table
        const clrTable = buildCLRTable(grammarCopy, dfa, startSymbol);

        let nonTerminals = Object.keys(grammarCopy);
        let adaptedTable = {};
        let terminalsSet = new Set(['$']); // Ensure $ is always present

        // Find all terminals from the table
        clrTable.forEach(state => {
            Object.keys(state).forEach(sym => {
                if (!nonTerminals.includes(sym)) terminalsSet.add(sym);
            });
        });

        // Split the table into ACTION (terminals) and GOTO (non-terminals)
        for (let i = 0; i < clrTable.length; i++) {
            adaptedTable[i] = { ACTION: {}, GOTO: {} };
            for (let sym in clrTable[i]) {
                if (nonTerminals.includes(sym)) {
                    adaptedTable[i].GOTO[sym] = clrTable[i][sym];
                } else {
                    adaptedTable[i].ACTION[sym] = clrTable[i][sym];
                }
            }
        }

        // Save it to the global cache so the simulate button can find it!
        cachedLR0TableData = {
            table: adaptedTable,
            terminals: Array.from(terminalsSet),
            nonTerminals: nonTerminals
        };

        currentMode = "CLR1";

        // Format the final output
        let outputHTML = "=== CLR(1) PARSING TABLE ===<br>";
        outputHTML += generateCLRTableHTML(clrTable, grammarCopy);
        outputHTML += "<br><br>=== CLR(1) CANONICAL COLLECTION ===<br>";
        outputHTML += generateCLRStatesHTML(dfa);

        jsonOutput.innerHTML = outputHTML;
    });

    // ==========================================
    // LALR(1) Button Event Listener
    // ==========================================
    lalrBtn.addEventListener('click', () => {
    const rawText = grammarInput.value;
    const rawGrammar = parseGrammarInput(rawText);
    
    // Deep copy the grammar
    const grammarCopy = JSON.parse(JSON.stringify(rawGrammar));
    const startSymbol = Object.keys(grammarCopy)[0];

    if (!startSymbol) {
        jsonOutput.innerHTML = "<span style='color: #ff4d4d;'>Please enter a valid grammar.</span>";
        return;
    }

    // Compute FIRST sets
    const firstSets = computeFirstSets(grammarCopy);
    
    // 1. Build the CLR(1) DFA first (The uncompressed version)
    const clrDFA = buildCLRDFA(grammarCopy, startSymbol, firstSets);
    
    // 2. Compress it into LALR(1)
    const lalrDFA = buildLALRDFA(clrDFA);
    
    // 3. Build the Parsing Table using the new compressed DFA
    const lalrTable = buildCLRTable(grammarCopy, lalrDFA, startSymbol);

    let nonTerminals = Object.keys(grammarCopy);
    let adaptedTable = {};
    let terminalsSet = new Set(['$']); // Ensure $ is always present

    // Find all terminals from the table
    lalrTable.forEach(state => {
        Object.keys(state).forEach(sym => {
            if (!nonTerminals.includes(sym)) terminalsSet.add(sym);
        });
    });

    // Split the table into ACTION (terminals) and GOTO (non-terminals)
    for (let i = 0; i < lalrTable.length; i++) {
        adaptedTable[i] = { ACTION: {}, GOTO: {} };
        for (let sym in lalrTable[i]) {
            if (nonTerminals.includes(sym)) {
                adaptedTable[i].GOTO[sym] = lalrTable[i][sym];
            } else {
                adaptedTable[i].ACTION[sym] = lalrTable[i][sym];
            }
        }
    }

    // Save it to the global cache so the simulate button can find it!
    cachedLR0TableData = {
        table: adaptedTable,
        terminals: Array.from(terminalsSet),
        nonTerminals: nonTerminals
    };

    currentMode = "LALR1";

    // Format the final output (Reusing your CLR HTML generators!)
    let outputHTML = "=== LALR(1) PARSING TABLE ===<br>";
    outputHTML += generateCLRTableHTML(lalrTable, grammarCopy);
    outputHTML += "<br><br>=== LALR(1) CANONICAL COLLECTION ===<br>";
    outputHTML += generateCLRStatesHTML(lalrDFA);

    jsonOutput.innerHTML = outputHTML;
    
    console.log(`LALR(1) Generated! States compressed from ${clrDFA.states.length} to ${lalrDFA.states.length}`);
    });

    compBtn.addEventListener('click', () => {
    const rawText = document.getElementById('grammar-input').value;
    const grammar = parseGrammarInput(rawText);
    const startSymbol = Object.keys(grammar)[0];

    if (!startSymbol) {
        document.getElementById('json-output').innerHTML = "<span style='color: #ff4d4d;'>Please enter a valid grammar.</span>";
        return;
    }

    // 1. Compute Math Sets (Only done once!)
    const firstSets = computeFirstSets(grammar);
    const followSets = computeFollowSets(grammar, firstSets);

    try {
        // ==========================================
        // 2. SILENTLY GENERATE ALL DFAS & TABLES
        // ==========================================

        // LL(1) - Top Down
        const { conflicts: ll1Conflicts } = generateLL1Table(grammar, firstSets, followSets);
        const ll1Status = ll1Conflicts.length === 0 
            ? "<span style='color: #4caf50; font-weight: bold;'>Accepted</span>" 
            : "<span style='color: #ff4d4d; font-weight: bold;'>Failed (Conflicts)</span>";
        
        // LR(0) 
        const lr0DFA = generateLR0DFA(grammar, startSymbol);
        const lr0TableData = generateLR0Table(lr0DFA, grammar, startSymbol); 

        // SLR(1)
        const slr1DFA = generateLR0DFA(grammar, startSymbol); 
        const slr1TableData = generateSLR1Table(slr1DFA, grammar, startSymbol);

        // CLR(1)
        const clrDFA = buildCLRDFA(grammar, startSymbol, firstSets);
        const clrTable = buildCLRTable(grammar, clrDFA, startSymbol);

        // LALR(1)
        const lalrDFA = buildLALRDFA(clrDFA);
        const lalrTable = buildCLRTable(grammar, lalrDFA, startSymbol);

        // ==========================================
        // 3. RENDER THE COMPARISON DASHBOARD
        // ==========================================
        
        let html = `
        <h3 style="color: white; text-align: center; margin-bottom: 20px;">Parser Comparison Dashboard</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: center; color: white; border: 1px solid #555;">
            <thead>
                <tr style="background-color: #333;">
                    <th style="padding: 12px; border: 1px solid #555;">Parser Type</th>
                    <th style="padding: 12px; border: 1px solid #555;">Grammar Status</th>
                    <th style="padding: 12px; border: 1px solid #555;">Total States Generated</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #555; font-weight: bold; color: #03a9f4;">LL(1)</td>
                    <td style="padding: 10px; border: 1px solid #555;">${ll1Status}</td>
                    <td style="padding: 10px; border: 1px solid #555; font-style: italic; color: #888;">N/A (Top-Down)</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #555; font-weight: bold; color: #ff9800;">LR(0)</td>
                    <td style="padding: 10px; border: 1px solid #555;">${getParserStatus(lr0TableData)}</td>
                    <td style="padding: 10px; border: 1px solid #555;">${Object.keys(lr0DFA).length}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #555; font-weight: bold; color: #4caf50;">SLR(1)</td>
                    <td style="padding: 10px; border: 1px solid #555;">${getParserStatus(slr1TableData)}</td>
                    <td style="padding: 10px; border: 1px solid #555;">${Object.keys(slr1DFA).length}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #555; font-weight: bold; color: #f44336;">LALR(1)</td>
                    <td style="padding: 10px; border: 1px solid #555;">${getParserStatus(lalrTable)}</td>
                    <td style="padding: 10px; border: 1px solid #555;">${lalrDFA.states.length}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #555; font-weight: bold; color: #9c27b0;">CLR(1)</td>
                    <td style="padding: 10px; border: 1px solid #555;">${getParserStatus(clrTable)}</td>
                    <td style="padding: 10px; border: 1px solid #555;">${clrDFA.states.length}</td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; font-size: 0.9em; color: #aaa; text-align: center;">
            <em>* "Accepted" means the parsing table was generated with zero Shift/Reduce or Reduce/Reduce conflicts.</em>
        </div>
        `;

        // Inject the dashboard into your output container
        document.getElementById('json-output').innerHTML = html;

    } catch (error) {
        console.error("Comparison Failed:", error);
        alert("An error occurred during comparison. Check console for details.");
    }
    });
});