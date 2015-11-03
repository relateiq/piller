var getLastNWords = require('./util/getLastNWords');
var getWords = require('./util/getWords');

module.exports = doPillSearch;

function doPillSearch(ui, props) {
  var selStart = ui.textarea.selectionStart;
  var valAtCaret = ui.textarea.value.substring(0, selStart);
  var pillAtCaret;

  if (!valAtCaret || (props.originalKeyEvent && props.originalKeyEvent.which === 13)) {
    return [];
  }

  props.modelValue.getPillRanges().some(function(pillRange) {
    if (selStart > pillRange.positionStart && selStart <= pillRange.positionEnd) {
      pillAtCaret = pillRange;
      return true;
    }
  });

  if (pillAtCaret) {
    return [];
  }

  var maxSearchWordsForItems = 0;
  var searchPrefixData = {};
  var result = [];
  props.pillSearchMatches = [];

  props.getPillCorpus().forEach(function(pillRange) {
    if (pillRange.maxSearchWords > maxSearchWordsForItems) {
      maxSearchWordsForItems = pillRange.maxSearchWords;
    }

    searchPrefixData[pillRange.searchPrefix] = searchPrefixData[pillRange.searchPrefix] || {};
    searchPrefixData[pillRange.searchPrefix].items = searchPrefixData[pillRange.searchPrefix].items || [];
    searchPrefixData[pillRange.searchPrefix].items.push(pillRange);

    var minCharsForPrefix = searchPrefixData[pillRange.searchPrefix].minChars;
    if (typeof minCharsForPrefix !== 'number' || pillRange.minSearchCharacters < minCharsForPrefix) {
      searchPrefixData[pillRange.searchPrefix].minChars = pillRange.minSearchCharacters;
    }

    var maxWordsForPrefix = searchPrefixData[pillRange.searchPrefix].maxWords;
    if (typeof maxWordsForPrefix !== 'number' || pillRange.maxSearchWords < maxWordsForPrefix) {
      searchPrefixData[pillRange.searchPrefix].maxWords = pillRange.maxSearchWords;
    }
  });

  Object.each(searchPrefixData, function(searchPrefix, data) {
    var lastWords = getLastNWords(valAtCaret, data.maxWords, true);
    var matches = getSearchMatches(props, searchPrefix, lastWords, data.minChars, data.items);

    if (matches && matches.length) {
      result = result.concat(matches);
    }
  });

  return result;
}

function getSearchMatches(props, searchPrefix, lastWords, minSearchCharacters, pillsForPrefix) {
  if (!lastWords) {
    return null;
  }

  if (searchPrefix && lastWords.lastIndexOf(searchPrefix) === (lastWords.length - searchPrefix.length)) {
    return pillsForPrefix;
  }

  var hasWordsStartingWithSearchPrefix = false;

  if (searchPrefix) {
    var tempWords = getWords(lastWords);

    for (var i = tempWords.length - 1; i >= 0; i--) {
      if (tempWords[i].indexOf(searchPrefix) === 0) {
        lastWords = tempWords.substring(i).join(' ') + (lastWords[lastWords.length - 1] === ' ' ? ' ' : '');
        hasWordsStartingWithSearchPrefix = true;
        break;
      }
    }
  }

  if (!hasWordsStartingWithSearchPrefix && lastWords.length < minSearchCharacters) {
    return null;
  }

  return pillsForPrefix.filter(function(item) {
    var match = getMatch(item.searchText, lastWords, searchPrefix, minSearchCharacters);

    if (match) {
      props.pillSearchMatches.push({
        query: match,
        value: item
      });
    }

    return !!match;
  });
}

function getMatch(compareWith, lastWords, searchPrefix, minSearchCharacters) {
  if (compareWith) {
    var wordsLen = getWords(lastWords).length;

    for (var i = wordsLen; i > 0; i--) {
      var str = getLastNWords(lastWords, i, true);
      var hasSearchPrefix = !!searchPrefix && str.indexOf(searchPrefix) === 0;
      var query = hasSearchPrefix ? str.substring(searchPrefix.length) : str;
      var compareWithLen = getWords(compareWith).length;

      for (var j = compareWithLen; j > 0; j--) {
        var compareWords = getLastNWords(compareWith, j, false);

        if (compareWords && compareWords.toLowerCase().indexOf(query) === 0) {
          return ((hasSearchPrefix && query.length) || str.length >= minSearchCharacters) ? str : null;
        }
      }
    }
  }
  return null;
}