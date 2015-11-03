var WORDS_REGEX = /\S+/g;

module.exports = function getWords(str) {
  return str.trim().match(WORDS_REGEX) || [];
};