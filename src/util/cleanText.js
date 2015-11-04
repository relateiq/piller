var newLineRegEx = /\n|\r/gi;

module.exports = function cleanText(untrustedString, keepNewLines) {
  // Remove any existing markup
  var clean = escapeHTML(unescapeHTML(untrustedString));

  // Replace carriage returns with markup
  if (keepNewLines) {
    clean = clean.replace(newLineRegEx, '<br>');
  }

  return clean;
};

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\//g, '&#x2f;');
}

function unescapeHTML(str) {
  return str.replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x2f;/g, '/')
    .replace(/&amp;/g, '&');
}