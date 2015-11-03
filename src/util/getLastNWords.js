module.exports = function getLastNWords(str, n, allowTrailingSpace) {
  var match = str.match(new RegExp('([\\S]+\\s+){0,' + (n - 1) + '}[\\S]+' + (allowTrailingSpace ? '\\s{0,1}' : '') + '$', 'ig'));
  return Array.isArray(match) ? match[0].replace(/\s/, ' ') : match;
};