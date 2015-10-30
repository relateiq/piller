var cleanText = require('./util/cleanText');
var initUI = require('./UI');

module.exports = {
  create: create
};

function create(container, pillCorpus, options) {
  var props = initProps(pillCorpus, options);
  var pillerInstance = {
    UI: initUI(container),
    destroy: destroy.bind(null, props)
  };

  defineModelValueOnInstance(pillerInstance, props);
  registerTextareaEvents(pillerInstance.UI, props);

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
    set: setModelValue.bind(null, pillerInstance.UI, props)
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
    props.modelValue.clearPillRanges();
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
}

function updateRanges(props, changeStart, changeEnd, insertionCount) {
  var indexDelta = changeStart - changeEnd + (insertionCount || 0);
  var retainedPillRanges = [];

  props.modelValue.getPillRanges().forEach(function(pillRange) {
    //update position for and retain pill when the change ends before it
    if (changeEnd <= pillRange.positionStart) {
      pillRange.positionStart = pillRange.positionStart + indexDelta;
      retainedPillRanges.push(pillRange);
    }
    //retain pill when the change starts after it
    else if (changeStart >= pillRange.positionEnd) {
      retainedPillRanges.push(pillRange);
    }
  });

  props.modelValue.setPillRanges(retainedPillRanges);
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
  props.modelValue = newModelValue || props.modelValue || RiqTextModelValue();
  ui.textarea.value = props.modelValue.text;
  updateDecorator(ui, props);
  updateStorageTimer();
}

function setModelValue(ui, props, newModelValue) {
  clearTypingTimers();

  if (newModelValue) {
    synchronize(ui, props, newModelValue);
    maybeStoreModelValue(props);
  } else if (props.modelValue) {
    clearStorageState(props);
  } else {
    newModelValue = getStoredModelValue(props);
  }

  synchronize(newModelValue || RiqTextModelValue());
}

function updateDecorator(ui, props) {
  var cleanHtml = getCleanHtmlWithRanges(ui, props);

  //&nbsp; is an invisible character that gives a true height to the div when <br> is ignored for size
  if (cleanHtml.endsWith('<br>')) {
    cleanHtml += '&nbsp;';
  }

  ui.decorator.innerHTML = cleanHtml;

  var decoratorHeight = ui.decorator.getBoundingClientRect().height;

  if (decoratorHeight !== props.elementHeight) {
    props.elementHeight = decoratorHeight;
    ui.textarea.style.height = props.elementHeight + 'px';
  }
}

function getCleanHtmlWithRanges(ui, props) {
  var lastPositionEnd = 0;
  var cleanResult = '';

  props.modelValue.getPillRanges().forEach(function(range) {
    cleanResult += cleanText(props.modelValue.text.substring(lastPositionEnd, range.positionStart), true);
    cleanResult += range.html;
    lastPositionEnd = range.positionEnd;
  });

  cleanResult += cleanText(props.modelValue.text.substring(lastPositionEnd), true);

  return cleanResult;
}

function maybeFocusPill(ui, props, e, preventIfAtStart, preventIfAtEnd) {
  if (props.originalKeyEvent && !props.originalKeyEvent.ctrlKey && !props.originalKeyEvent.metaKey && props.preInputSelStart === props.preInputSelEnd) {
    var pillRangeWithCaret = props.modelValue.getPillRanges().some(function(pillRange) {
      if (isIndexWithinRange(props.preInputSelStart, pillRange) &&
        !(preventIfAtStart && props.preInputSelStart === pillRange.positionStart) &&
        !(preventIfAtEnd && props.preInputSelStart === pillRange.positionEnd)) {
        pillRangeWithCaret = pillRange;
        return true;
      }
    });

    if (pillRangeWithCaret) {
      var indexOfRangeWithCaret = 0;
      e.preventDefault();

      props.modelValue.getPillRanges().forEach(function(pillRange) {
        if (pillRange === pillRangeWithCaret) {
          return false;
        }
        indexOfRangeWithCaret++;
      });

      var pillEl = ui.decorator.querySelectorAll[indexOfRangeWithCaret];

      if (pillEl) {
        pillEl.focus();
      }
    }
  }
}

function isIndexWithinRange(index, range) {
  return index >= range.positionStart && index <= range.positionEnd;
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
  props.typingTimeout = setTimeout(clearTypingWatch, 500);
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
      localStorage.setItem(props.options.storageKey, props.modelValue.getStorageValue());
    }
  }
}

function getStoredModelValue(props) {
  var storedValue = props.options.storageKey && localStorage.getItem(props.options.storageKey) || null;

  if (storedValue) {
    var instantiatedPills = [];
    if (storedValue.pillRanges) {
      storedValue.pillRanges.forEach(function(ref) {
        props.getPillCorpus(props).forEach(function(corpusRef) {
          if (corpusRef.id === ref.id) {
            var refInstance = RiqTextAtReference(ref.id, ref.value, ref.text.from(1), ref.searchText, ref.className, ref.positionStart);
            instantiatedPills.push(refInstance);
            return false;
          }
        });
      });
    }
    return RiqTextModelValue(storedValue.text, instantiatedPills);
  }

  return null;
}