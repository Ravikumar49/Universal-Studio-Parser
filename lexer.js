function tokenizeInput(rawString) {
    // Remove extra spaces at the ends, then break the string into an array
    let words = rawString.trim().split(/\s+/);

    let tokens = [];

    for(let word of words) {
        // We use a regular expression to test the current word in the loop
        let isLetterOnly = /^[a-zA-Z]+$/.test(word);

        if(isLetterOnly) {
            // If it's pure letter classify it as an 'id'
            tokens.push( {token: "id", lexeme: word} );
        }
        else {
            // Else it's an operator or symbol
            tokens.push( {token: word, lexeme: word} );
        }
    }

    // Always append the end of input marker for the SLR(1)
    tokens.push( {token: "$", lexeme: "$"} );
    return tokens;
}