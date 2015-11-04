var cleanText = require('./util/cleanText');
var initUI = require('./UI');
var pillerModelValue = require('./pillerModelValue');
var pillerPill = require('./pillerPill');
var searchForMatches = require('./search');

module.exports = {
  create: create,
  createPill: pillerPill,
  createModelValue: pillerModelValue
};

function create(container, pillCorpus, options) {
  var props = initProps(pillCorpus, options);
  var ui = initUI(container);
  var pillerInstance = {
    ui: ui,
    selectSearchMatch: selectSearchMatch.bind(null, ui, props),
    destroy: destroy.bind(null, props)
  };

  defineModelValueOnInstance(pillerInstance, props);
  registerTextareaEvents(pillerInstance.ui, props);
  registerDecoratorEvents(pillerInstance.ui, props);

  setModelValue(ui, props);

  return pillerInstance;
}

function initProps(pillCorpus, options) {
  var props = {
    options: options,
    getPillCorpus: function() {
      return typeof pillCorpus === 'function' && pillCorpus() || pillCorpus || [];
    }
  };

  return props;
}

function destroy(props) {
  clearTypingTimers(props);
  clearTimeout(props.focusTimeout);
  clearTimeout(props.postInputCleanupTimeout);
}

function defineModelValueOnInstance(pillerInstance, props) {
  Object.defineProperty(pillerInstance, 'modelValue', {
    enumerable: true,
    get: function() {
      return props.modelValue;
    },
    set: setModelValue.bind(null, pillerInstance.ui, props)
  });
}

function registerTextareaEvents(ui, props) {
  var onPreInputEventSetupListener = onPreInputEventSetup.bind(null, ui, props);

  ['keydown', 'keypress', 'paste', 'cut'].forEach(function(eventName) {
    ui.textarea.addEventListener(eventName, onPreInputEventSetupListener);
  });

  ['drop', 'dragstart'].forEach(function(eventName) {
    ui.textarea.addEventListener(eventName, function(e) {
      e.preventDefault();
    });
  });

  ui.textarea.addEventListener('keydown', onPreInputKeydown.bind(null, ui, props));
  ui.textarea.addEventListener('keypress', onPreInputKeypress.bind(null, ui, props));
  ui.textarea.addEventListener('keyup', onPreInputKeyup.bind(null, ui, props));
  ui.textarea.addEventListener('focus', onTextareaFocus.bind(null, ui, props));
  ui.textarea.addEventListener('blur', onTextareaBlur.bind(null, ui, props));
  ui.textarea.addEventListener('input', onTextareaInput.bind(null, ui, props));
}

function registerDecoratorEvents(ui, props) {
  addDelegatedPillListener(ui, 'keydown', onPillKeydown.bind(null, ui, props));
  addDelegatedPillListener(ui, 'focusin', onPillFocus.bind(null, ui, props));
  addDelegatedPillListener(ui, 'focusout', onPillBlur.bind(null, ui, props));
}

function addDelegatedPillListener(ui, eventName, listener) {
  ui.decorator.addEventListener(eventName, function(e) {
    if (e.target.classList.contains('js-piller-pill')) {
      listener(e);
    }
  });
}

function onPreInputEventSetup(ui, props, e) {
  props.preInputEvent = e;
  props.preInputVal = ui.textarea.value;
  storePreInputSelection(ui, props);

  //timeout needed to reset preInput declarations above after all key and input events fire
  clearTimeout(props.postInputCleanupTimeout);
  props.postInputCleanupTimeout = setTimeout(postInputCleanup.bind(null, props));
}

function onPreInputKeydown(ui, props, e) {
  var isValidEvent = false;
  var preventIfAtStart = false;
  var preventIfAtEnd = false;

  props.originalKeyEvent = e;

  switch (e.which) {
    case 37: // LEFT_ARROW
    case 8: // BACKSPACE
      preventIfAtStart = isValidEvent = true;
      break;
    case 39: // RIGHT_ARROW
    case 46: // DELETE
      preventIfAtEnd = isValidEvent = true;
      break;
  }

  if (isValidEvent && props.preInputSelStart === props.preInputSelEnd) {
    maybeFocusPill(ui, props, e, preventIfAtStart, preventIfAtEnd);
  }
}

function onPillFocus(ui) {
  ui.textarea.classList.add('focus');
}

function onPillBlur(ui) {
  ui.textarea.classList.remove('focus');
}

function onPreInputKeypress(ui, props, e) {
  props.originalKeyEvent = e;
}

function onPreInputKeyup(ui, props, e) {
  switch (e.which) {
    case 37: // LEFT_ARROW
    case 38: // UP_ARROW
    case 39: // RIGHT_ARROW
    case 40: // DOWN_ARROW
      storePreInputSelection(ui, props);
      maybeFocusPill(ui, props, e, true, true);
      break;
  }
}

function onTextareaFocus(ui, props, e) {
  //timeout needed to reflect correct selection start & end in textarea
  clearTimeout(props.focusTimeout);
  props.focusTimeout = setTimeout(function() {
    storePreInputSelection(ui, props);
    maybeFocusPill(ui, props, e, true, true);
  });
}

function onTextareaBlur(ui, props) {
  clearTimeout(props.focusTimeout);
}

function onTextareaInput(ui, props) {
  props.modelValue.text = ui.textarea.value;

  if (!props.preInputVal || !props.modelValue.text) {
    props.modelValue.clearPills();
  } else if (props.preInputEvent && props.preInputSelStart === props.preInputSelEnd) { //don't continue for selection due to Mac difference with backspace for single word selection
    var prevType = props.preInputEvent.type.toLowerCase();
    var hasShortcutKey = props.preInputEvent.ctrlKey || props.preInputEvent.metaKey || props.preInputEvent.altKey;

    if (props.preInputEvent.which === 8 && !hasShortcutKey) { // BACKSPACE
      updateRanges(props, props.preInputSelStart - 1, props.preInputSelEnd);
    } else if (props.preInputEvent === 46 && !hasShortcutKey) { // DELETE
      updateRanges(props, props.preInputSelStart, props.preInputSelEnd + 1);
    } else if (prevType === 'keypress' && !hasShortcutKey) {
      updateRanges(props, props.preInputSelStart, props.preInputSelEnd, 1);
    } else {
      updateRangesForStringDiff(props);
    }
  } else {
    updateRangesForStringDiff(props);
  }

  synchronize(ui, props);
  postInputCleanup(props);
  doSearch(ui, props);
}

function onPillKeydown(ui, props, e) {
  e.preventDefault();

  if (e.which !== 27) {
    e.stopPropagation();
  }

  switch (e.which) {
    case 8: // BACKSPACE
    case 46: // DELETE
      onRemovePill(ui, props, e);
      break;
    case 88: // X
      if (e.metaKey && !e.shiftKey) {
        onRemovePill(ui, props, e);
      }
      break;
    case 68: // D
      if (e.ctrlKey && !e.shiftKey) {
        onRemovePill(ui, props, e);
      }
      break;
    case 9: // TAB
    case 37: // LEFT_ARROW
    case 38: // UP_ARROW
    case 39: // RIGHT_ARROW
    case 40: // DOWN_ARROW
      e.preventDefault();
      var pillObj = getPillFromEvent(e);
      var newCaretPos = pillObj.positionStart;

      if ((e.which === 9 && !e.shiftKey) || e.which === 39 || e.which === 40) {
        newCaretPos = pillObj.positionEnd;
      }

      setCaretPosition(ui.textarea, newCaretPos);
      break;
  }
}

function onRemovePill(ui, props, e) {
  var pill = getPillFromEvent(ui, props, e);

  e.preventDefault();
  props.modelValue.removePill(pill);
  updateRanges(props, pill.positionStart, pill.positionEnd, 0);
  synchronize(ui, props);
  setCaretPosition(ui.textarea, pill.positionStart);
}

function getPillFromEvent(ui, props, e) {
  var pillIndex = ui.decorator.querySelectorAll('.js-piller-pill').indexOf(e.target);
  return props.modelValue.getPills()[pillIndex];
}

function updateRanges(props, changeStart, changeEnd, insertionCount) {
  var indexDelta = changeStart - changeEnd + (insertionCount || 0);
  var retainedPills = [];

  props.modelValue.getPills().forEach(function(pill) {
    //update position for and retain pill when the change ends before it
    if (changeEnd <= pill.positionStart) {
      pill.positionStart = pill.positionStart + indexDelta;
      retainedPills.push(pill);
    }
    //retain pill when the change starts after it
    else if (changeStart >= pill.positionEnd) {
      retainedPills.push(pill);
    }
  });

  props.modelValue.setPills(retainedPills);
}

function updateRangesForStringDiff(props) {
  var startDiff = getDifferenceStartIdx(props);
  var endDiff;

  if (startDiff < props.modelValue.text.length || startDiff < props.preInputVal.length) {
    endDiff = getDifferenceEndIdx(props, startDiff);
  } else {
    endDiff = Math.max(props.modelValue.text.length, props.preInputVal.length);
  }

  var insertionCount = endDiff + props.modelValue.text.length - props.preInputVal.length - startDiff;

  updateRanges(props, startDiff, endDiff, insertionCount > 0 ? insertionCount : 0);
}

function getDifferenceStartIdx(props) {
  var startDiff;

  for (startDiff = 0; startDiff < props.modelValue.text.length && startDiff < props.preInputVal.length; ++startDiff) {
    if (props.modelValue.text[startDiff] !== props.preInputVal[startDiff]) {
      break;
    }
  }

  return startDiff;
}

function getDifferenceEndIdx(props, startDiff) {
  var endDiff, newValIdx;
  if (startDiff === props.preInputVal.length) {
    endDiff = startDiff;
  } else if (startDiff === props.modelValue.text.length) {
    endDiff = props.preInputVal.length;
  } else {
    var newValLengthDiff = props.modelValue.text.length - props.preInputVal.length;

    for (endDiff = props.preInputVal.length, newValIdx = endDiff + newValLengthDiff; endDiff > startDiff && newValIdx > startDiff; endDiff--, newValIdx = endDiff + newValLengthDiff) {
      if (props.preInputVal[endDiff - 1] !== props.modelValue.text[endDiff + newValLengthDiff - 1]) {
        break;
      }
    }
  }
  return endDiff;
}

function storePreInputSelection(ui, props) {
  props.preInputSelStart = ui.textarea.selectionStart;
  props.preInputSelEnd = ui.textarea.selectionEnd;
}

function postInputCleanup(props) {
  //reset vars to account for input event that might not have a preInputEvent (e.g. spell correction only fires input event)
  props.preInputEvent = null;
  props.preInputVal = props.modelValue.text;
}

function synchronize(ui, props, newModelValue) {
  props.modelValue = newModelValue || props.modelValue || pillerModelValue();
  ui.textarea.value = props.modelValue.text;
  updateDecorator(ui, props);
  updateStorageTimer(props);
}

function setModelValue(ui, props, newModelValue) {
  clearTypingTimers(props);

  if (newModelValue) {
    synchronize(ui, props, newModelValue);
    maybeStoreModelValue(props);
  } else if (props.modelValue) {
    clearStorageState(props);
  } else {
    newModelValue = getStoredModelValue(props);
  }

  synchronize(ui, props, newModelValue || pillerModelValue());
}

function updateDecorator(ui, props) {
  var cleanHtml = getCleanHtmlWithPills(ui, props);

  //&nbsp; is an invisible character that gives a true height to the div when <br> is ignored for size
  if (cleanHtml.lastIndexOf('<br>') === cleanHtml.length - 4) {
    cleanHtml += '&nbsp;';
  }

  ui.decorator.innerHTML = cleanHtml;

  var decoratorHeight = ui.decorator.getBoundingClientRect().height;

  if (decoratorHeight !== props.elementHeight) {
    props.elementHeight = decoratorHeight;
    ui.textarea.style.height = props.elementHeight + 'px';
  }
}

function getCleanHtmlWithPills(ui, props) {
  var lastPositionEnd = 0;
  var cleanResult = '';

  props.modelValue.getPills().forEach(function(pill) {
    cleanResult += cleanText(props.modelValue.text.substring(lastPositionEnd, pill.positionStart), true);
    cleanResult += pill.html;
    lastPositionEnd = pill.positionEnd;
  });

  cleanResult += cleanText(props.modelValue.text.substring(lastPositionEnd), true);

  return cleanResult;
}

function maybeFocusPill(ui, props, e, preventIfAtStart, preventIfAtEnd) {
  if (props.originalKeyEvent && !props.originalKeyEvent.ctrlKey && !props.originalKeyEvent.metaKey && props.preInputSelStart === props.preInputSelEnd) {
    var pillWithCaret = props.modelValue.getPills().some(function(pill) {
      if (isIndexWithinPill(props.preInputSelStart, pill) &&
        !(preventIfAtStart && props.preInputSelStart === pill.positionStart) &&
        !(preventIfAtEnd && props.preInputSelStart === pill.positionEnd)) {
        pillWithCaret = pill;
        return true;
      }
    });

    if (pillWithCaret) {
      var indexOfPillWithCaret = 0;
      e.preventDefault();

      props.modelValue.getPills().forEach(function(pill) {
        if (pill === pillWithCaret) {
          return false;
        }
        indexOfPillWithCaret++;
      });

      var pillEl = ui.decorator.querySelectorAll[indexOfPillWithCaret];

      if (pillEl) {
        pillEl.focus();
      }
    }
  }
}

function isIndexWithinPill(index, pill) {
  return index >= pill.positionStart && index <= pill.positionEnd;
}

function updateStorageTimer(props) {
  if (!props.options.storageKey) {
    return;
  }

  if (!props.typingInterval) {
    props.typingInterval = setInterval(function() {
      maybeStoreModelValue(props);
    }, 500);
  }

  clearTimeout(props.typingTimeout);
  props.typingTimeout = setTimeout(clearTypingWatch.bind(null, props), 500);
}

function clearTypingTimers(props) {
  clearTypingWatch(props);
  clearTimeout(props.typingTimeout);
}

function clearStorageState(props) {
  maybeStoreModelValue(props, true);
}

function clearTypingWatch(props) {
  clearInterval(props.typingInterval);
  props.typingInterval = null;
}

function maybeStoreModelValue(props, isClearLS) {
  if (props.options.storageKey) {
    if (isClearLS || !props.modelValue.text) {
      localStorage.removeItem(props.options.storageKey);
    } else {
      localStorage.setItem(props.options.storageKey, JSON.stringify(props.modelValue));
    }
  }
}

function getStoredModelValue(props) {
  var storedValue = null;
  var instantiatedPills;

  if (props.options.storageKey) {
    storedValue = JSON.parse(localStorage.getItem(props.options.storageKey)) || null;
  }

  if (storedValue) {
    if (storedValue._pills) {
      var corpusMap = props.getPillCorpus(props).reduce(function(map, corpusPill) {
        map[corpusPill.id] = corpusPill;
        return map;
      }, {});

      instantiatedPills = storedValue._pills.map(function(pill) {
        return corpusMap[pill.id] || (props.options.excludeStoredPillsNotFoundInCorpus ? null : pillerPill(pill));
      }).filter(function(pill) {
        return !!pill;
      });
    }

    return pillerModelValue(storedValue.text, instantiatedPills);
  }

  return null;
}

function setCaretPosition(el, caretPosition) {
  el.focus();
  el.selectionStart = caretPosition;
  el.selectionEnd = caretPosition;
}

function doSearch(ui, props) {
  var matches = searchForMatches(ui, props);
  props.options.showSearchMatches(matches);
}

function selectSearchMatch(ui, props, selectedPill) {
  if (selectedPill) {
    var query;

    if (props.pillSearchMatches && props.pillSearchMatches.length) {
      var match;

      props.pillSearchMatches.some(function(corpusMatch) {
        if (selectedPill === corpusMatch.value) {
          match = corpusMatch;
          return true;
        }
      });

      query = match.query;
    } else {
      query = selectedPill.searchPrefix; //props.pillSearchMatches is empty on searchPrefix query
    }

    var idxs = getPillIndicesForQuery(ui, props, query);

    var selectedPillClone = selectedPill.clone();

    selectedPillClone.positionStart = idxs.start;
    var insertedText = selectedPillClone.text + selectedPillClone.suffix;
    var toEndOfNewVal = props.modelValue.text.substring(0, idxs.start) + insertedText;

    props.modelValue.text = toEndOfNewVal + props.modelValue.text.substring(idxs.end);
    updateRanges(idxs.start, idxs.end, insertedText.length);
    props.modelValue.addPill(selectedPillClone);

    synchronize(ui, props);
    setCaretPosition(toEndOfNewVal.length + selectedPillClone.caretPositionFromEnd);
    postInputCleanup();
  }
  return props.modelValue.text;
}

function getPillIndicesForQuery(ui, props, query) {
  var selStart = ui.textarea.selectionStart;
  var selEnd = ui.textarea.selectionEnd;
  var result = {
    start: selStart,
    end: selEnd
  };

  if (selStart === selEnd) {
    var valAtCaret = props.modelValue.text.substring(0, selStart);

    if (valAtCaret.lastIndexOf(query) === valAtCaret.length - query.length) {
      result.start -= query.length;
      result.end = result.start + query.length;
    }
  }

  return result;
}