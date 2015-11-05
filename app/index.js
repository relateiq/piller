var piller = require('../src');

var container = document.querySelector('.container');
var matchesEl = document.querySelector('.matches');
var pillCorpus = createPillCorpus();
var options = {
  scrollable: true,
  storageKey: 'myStorageKey',
  excludeStoredPillsNotFoundInCorpus: false,
  showSearchMatches: showSearchMatches
};

var pillerInstance = piller.create(container, pillCorpus, options);

function createPillCorpus() {
  var peoplePills = [{
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
    text: 'Mr. Uñîcõdê Man'
  }].map(function(obj) {
    return piller.createPill(obj.id, obj, obj.text, null, {
      searchPrefix: '@',
      minSearchCharacters: 3,
      maxSearchWords: 3
    });
  });

  var equationPills = [{
    id: '6',
    text: 'SUM'
  }, {
    id: '7',
    text: 'AVERAGE'
  }, {
    id: '8',
    text: 'MEDIAN'
  }, {
    id: '9',
    text: 'SIN'
  }, {
    id: '10',
    text: 'COS'
  }].map(function(obj) {
    return piller.createPill(obj.id, obj, obj.text, null, {
      searchPrefix: '=',
      minSearchCharacters: 2,
      maxSearchWords: 1,
      suffix: '(  )',
      caretPositionFromEnd: -2
    });
  });

  return peoplePills.concat(equationPills);
}

function showSearchMatches(matches) {
  matchesEl.innerHTML = '';

  matches.forEach(function(match, i) {
    var div = document.createElement('div');
    div.textContent = match.text;
    div.setAttribute('data-pill-id', match.id);

    if (i === 0) {
      setAsActive(div);
    }

    matchesEl.appendChild(div);
  });

  if (matches.length) {
    addSearchDisplayListeners();
  } else {
    removeSearchDisplayListeners();
  }
}

function addSearchDisplayListeners() {
  removeSearchDisplayListeners();
  pillerInstance.ui.textarea.addEventListener('keydown', onSearchDisplayKeydown);
}

function removeSearchDisplayListeners() {
  pillerInstance.ui.textarea.removeEventListener('keydown', onSearchDisplayKeydown);
}

function onSearchDisplayKeydown(e) {
  var handled = false;

  switch (e.which) {
    case 38: // UP_ARROW
      moveSearchSelection(-1);
      handled = true;
      break;
    case 40: // DOWN_ARROW
      moveSearchSelection(1);
      handled = true;
      break;
    case 9: // TAB
      if (!e.shiftKey) {
        selectSearchMatch();
        handled = true;
      }
    case 13: // ENTER
      selectSearchMatch();
      handled = true;
      break;
  }

  if (handled) {
    e.preventDefault();
  }
}

function selectSearchMatch() {
  var activeIndex = getActiveIndex();

  if (activeIndex < 0) {
    return;
  }

  var activeMatch = matchesEl.children[activeIndex];

  if (!activeMatch) {
    return;
  }

  var pillId = matchesEl.children[activeIndex].getAttribute('data-pill-id');
  var selectedPill;

  pillCorpus.some(function(pill) {
    if (pillId === pill.id) {
      selectedPill = pill;
      return true;
    }
  });

  pillerInstance.selectSearchMatch(selectedPill);
  matchesEl.innerHTML = '';
}

function getActiveIndex() {
  var activeIndex;

  Array.prototype.slice.call(matchesEl.children).some(function(child, i) {
    if (child.hasAttribute('active')) {
      activeIndex = i;
      return true;
    }
  });

  return activeIndex;
}

function moveSearchSelection(direction) {
  var origActiveIndex = getActiveIndex();
  var newActiveIndex = Math.max(0, Math.min(origActiveIndex + direction, matchesEl.children.length - 1));

  if (origActiveIndex !== newActiveIndex) {
    setAsNotActive(matchesEl.children[origActiveIndex]);
    setAsActive(matchesEl.children[newActiveIndex]);
  }
}

function setAsActive(el) {
  el.setAttribute('active', '');
  el.style.backgroundColor = '#dddddd';
}

function setAsNotActive(el) {
  el.removeAttribute('active');
  el.style.backgroundColor = '';
}