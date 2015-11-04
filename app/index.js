var piller = require('../src');

var container = document.getElementById('container');
var matchesEl = document.getElementById('matches');
var pillCorpus = createPillCorpus();
var options = {
  storageKey: 'myStorageKey',
  excludeStoredPillsNotFoundInCorpus: false,
  showSearchMatches: function(matches) {
    matchesEl.innerHTML = matches.map(function(match) {
      return '<div>' + match.text + '</div>';
    }).join('');
  }
};

var pillerInstance = piller.create(container, pillCorpus, options);

function createPillCorpus() {
  return [{
    id: '1',
    text: 'John Smith'
  }, {
    id: '2',
    text: 'Jane Smith'
  }, {
    id: '3',
    text: 'John Doe'
  }, {
    id: '4',
    text: 'Jane Doe'
  }, {
    id: '5',
    text: 'Mr. Uníñîcõdê Man'
  }].map(function(obj) {
    return piller.createPill(obj.id, obj, obj.text, null, {
      searchPrefix: '@',
      minSearchCharacters: 2,
      maxSearchWords: 3
    });
  });
}