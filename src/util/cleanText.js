var newLineRegEx = /\n|\r/gi;

module.exports = function cleanText(untrustedString, keepNewLines) {
    // Remove any existing markup
    var clean = untrustedString.unescapeHTML().escapeHTML();

    // Replace carriage returns with markup
    if (keepNewLines) {
        clean = clean.replace(newLineRegEx, '<br>');
    }

    return clean;
};