var piller = require('./');

describe('piller', function() {
  var backspaceChar = '\u0008';
  var deleteChar = '\u007F';
  var isMacOS = !!(~window.navigator.userAgent.indexOf('Mac OS'));

  beforeEach(function() {
    this.backspaceChar = backspaceChar;
    this.deleteChar = deleteChar;
    this.defaultOptions = {
      storageKey: 'testStorageKey',
      excludeStoredPillsNotFoundInCorpus: false,
      showSearchMatches: function() {}
    };
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    this.pill = createPill.call(this);

    this.pillTextValue = this.pill.text + ' ';
    this.pillHtmlValue = this.pill.html + ' ';

    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
    localStorage.clear();

    document.body.removeChild(this.container);

    if (this.pillerInstance) {
      this.pillerInstance.destroy();
    }
  });

  function setSelectionRange(selStart, selEnd) {
    this.pillerInstance.ui.textarea.selectionStart = selStart;
    this.pillerInstance.ui.textarea.selectionEnd = typeof selEnd === 'number' ? selEnd : selStart;
  }

  function triggerInput(newValue) {
    this.pillerInstance.ui.textarea.value = newValue;
    this.pillerInstance.ui.textarea.dispatchEvent(new Event('input'));
    flushTimers();
  }

  function triggerKey(el, eventName, eventProps) {
    var keyboardEvent = new Event(eventName);
    el.dispatchEvent(Object.assign(keyboardEvent, eventProps));
  }

  function triggerKeyEvents(el, charCode, keyCode, eventExtras, input) {
    var eventProps = Object.assign({
      charCode: charCode,
      keyCode: keyCode,
      which: charCode || keyCode
    }, eventExtras);

    triggerKey(el, 'keydown', eventProps);
    triggerKey(el, 'keypress', eventProps);
    triggerKey(el, 'keyup', eventProps);

    if (typeof input === 'string') {
      triggerInput.call(this, input);
    } else {
      flushTimers();
    }
  }

  function simulateKeyEvents(charCode, keyCode, selStart, selEnd, charToAdd, eventExtras) {
    var oldValue = this.pillerInstance.ui.textarea.value;
    var newValue = '';

    selStart = typeof selStart === 'number' ? selStart : 0;
    selEnd = typeof selEnd === 'number' ? selEnd : 0;

    setSelectionRange.call(this, selStart, selEnd);

    if (selStart > selEnd) {
      throw 'selection start should never be greater than selection end';
    } else if (selStart !== selEnd) {
      newValue = oldValue.substring(0, selStart) + oldValue.substring(selEnd);
    } else if (!charToAdd) {
      newValue = oldValue.substring(0, selStart - 1) + oldValue.substring(selEnd);
    } else {
      newValue = oldValue;
    }

    if (charToAdd) {
      newValue = newValue.slice(0, selStart) + charToAdd + newValue.slice(selStart);
    }

    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, charCode, keyCode, eventExtras, newValue);
  }

  function simulateTypingOfString(str, selStart, selEnd, eventExtras) {
    for (var i = 0; i < str.length; i++) {
      var start = (selStart || 0) + i;
      var end = i > 0 ? start : (selEnd || start);
      var charCode = str.charCodeAt(i);
      var charToAdd = str[i];
      var keyCode = null;

      switch (str[i]) {
        case '\n':
          charCode = 0;
          keyCode = 13; // ENTER
          break;
        case this.backspaceChar:
          charCode = 0;
          charToAdd = null;
          keyCode = 8; // BACKSPACE
          break;
        case this.deleteChar:
          charCode = 0;
          charToAdd = null;
          keyCode = 46; // DELETE
          break;
      }

      simulateKeyEvents.call(this, charCode, keyCode, start, end, charToAdd, eventExtras);
    }
  }

  function flushTimers() {
    jasmine.clock().tick(600);
  }

  function storageExpects(text, pills) {
    var storedValue = JSON.parse(localStorage.getItem(this.defaultOptions.storageKey));

    if (text) {
      expect(storedValue.text).toBe(text);
      expect(storedValue._pills).toEqual(pills && JSON.parse(JSON.stringify(pills)) || []);
    } else {
      expect(storedValue).toBeFalsy();
    }
  }

  function modelExpects(text, html, pills) {
    expect(this.pillerInstance.modelValue.text).toBe(text);
    expect(this.pillerInstance.ui.textarea.value).toBe(text);
    expect(this.pillerInstance.ui.decorator.innerHTML).toBe(html);
    expect(JSON.parse(JSON.stringify(this.pillerInstance.modelValue.getPills()))).toEqual(pills && JSON.parse(JSON.stringify(pills)) || []);
    storageExpects.call(this, text, pills);
  }

  function createPill(positionStart, value, text) {
    if (typeof positionStart !== 'number' && this.pillerInstance) {
      positionStart = this.pillerInstance.ui.textarea.selectionStart;
    }

    return piller.createPill(value && value.id || 'id', value || {}, text || 'test at reference', positionStart, {
      searchPrefix: '@',
      prefix: '@'
    });
  }

  function basicTextTest(plainText, html) {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    simulateTypingOfString.call(this, plainText);
    modelExpects.call(this, plainText, html);
  }

  function insertTextTest(startValue, typedValue, resultValue, resultHtml, selStart, selEnd) {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    simulateTypingOfString.call(this, startValue);
    simulateTypingOfString.call(this, typedValue, selStart, selEnd);

    modelExpects.call(this, resultValue, resultHtml);
  }

  function insertPill(pillOverride, optionalEndIndex) {
    var pill = pillOverride || createPill.call(this);
    var newCaretPos = this.pillerInstance.modelValue.addPill(pill, optionalEndIndex);
    setSelectionRange.call(this, newCaretPos);
    flushTimers();
    return pill;
  }

  function basicPillTest(startValue, caretPos, numAdjacentPills) {
    var finalPillValue = '';
    var finalPillHtmlValue = '';
    var startText = '';
    var endText = '';
    var pills = [];
    numAdjacentPills = numAdjacentPills || 1;

    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);

    if (typeof caretPos === 'number') {
      startText = startValue.substring(0, caretPos);
      endText = startValue.substring(caretPos);
    } else {
      startText = startValue;
    }

    simulateTypingOfString.call(this, startText + endText);

    if (typeof caretPos === 'number') {
      this.pillerInstance.ui.textarea.selectionStart = caretPos;
      this.pillerInstance.ui.textarea.selectionEnd = caretPos;
    }

    var insertIndex = this.pillerInstance.ui.textarea.selectionStart;

    for (var i = 0; i < numAdjacentPills; i++) {
      var p = createPill.call(this, insertIndex);
      pills.push(p);
      insertPill.call(this, p);
      finalPillValue += p.text + p.suffix;
      finalPillHtmlValue += p.html + p.suffix;

      insertIndex += (p.text + p.suffix).length;
    }

    modelExpects.call(this, startText + finalPillValue + endText, startText.replace('\n', '<br>') + finalPillHtmlValue + endText, pills);
  }

  it('should render plain text', function() {
    basicTextTest.call(this, 'hello world', 'hello world');
  });

  it('should render a break in html for a new line', function() {
    basicTextTest.call(this, 'hello\nworld', 'hello<br>world');
  });

  it('should render multiple breaks in html for multiple new lines', function() {
    basicTextTest.call(this, 'hello\n\n\nworld', 'hello<br><br><br>world');
  });

  it('should replace selection range at index 0 with new characters', function() {
    insertTextTest.call(this, 'cheerio', 'spaghett', 'spaghettio', 'spaghettio', 0, 5);
  });

  it('should replace middle selection range with new characters', function() {
    insertTextTest.call(this, 'stanford', 'o tire', 'so tired', 'so tired', 1, 7);
  });

  it('should replace selection range at the end of input with new characters', function() {
    insertTextTest.call(this, 'relateIQ', 'ionship', 'relationship', 'relationship', 5, 8);
  });

  it('should replace html breaks in selection range', function() {
    var result = 'I am the slightest bit tired';
    insertTextTest.call(this, 'I am\nvery\ntired', ' the slightest bit ', result, result, 4, 10);
  });

  it('should replace selection range with breaks in html', function() {
    insertTextTest.call(this, 'I am the slightest bit tired', '\nvery\n', 'I am\nvery\ntired', 'I am<br>very<br>tired', 4, 23);
  });

  function doAdjacentPillTests(numAdjacentPills) {
    var pillDescription = numAdjacentPills + ' @ reference' + (numAdjacentPills > 1 ? 's' : '');

    it('should insert ' + pillDescription + ' as only content', function() {
      basicPillTest.call(this, '', null, numAdjacentPills);
    });

    it('should insert ' + pillDescription + ' after text content', function() {
      basicPillTest.call(this, 'hello ', null, numAdjacentPills);
    });

    it('should insert ' + pillDescription + ' before text content', function() {
      basicPillTest.call(this, 'hello', 0, numAdjacentPills);
    });

    it('should insert ' + pillDescription + ' in between text content', function() {
      basicPillTest.call(this, 'hello world', 6, numAdjacentPills);
    });

    it('should insert ' + pillDescription + ' after new line', function() {
      basicPillTest.call(this, 'hello\n', null, numAdjacentPills);
    });

    it('should set caret after inserted ' + pillDescription, function() {
      var startValue = 'hello world';
      var caretPos = 6;

      basicPillTest.call(this, startValue, caretPos, numAdjacentPills);
      expect(this.pillerInstance.ui.textarea.selectionStart).toBe(caretPos + this.pillTextValue.length * numAdjacentPills);
    });

    it('should insert ' + pillDescription + ' and then remove all content', function() {
      basicPillTest.call(this, '', 0, numAdjacentPills);
      simulateTypingOfString.call(this, this.backspaceChar, 0, this.pillTextValue.length * numAdjacentPills);
      modelExpects.call(this, '', '');
    });

    it('should insert ' + pillDescription + ' with text and then remove all content', function() {
      var startValue = 'hello world';
      var caretPos = 6;

      basicPillTest.call(this, startValue, caretPos, numAdjacentPills);
      simulateTypingOfString.call(this, this.backspaceChar, 0, startValue.length + this.pillTextValue.length * numAdjacentPills);
      modelExpects.call(this, '', '');
    });

    it('should remove all inserted ' + pillDescription, function() {
      var startValue = 'hello world';
      var caretPos = 6;

      basicPillTest.call(this, startValue, caretPos, numAdjacentPills);
      simulateTypingOfString.call(this, 'test ', caretPos, caretPos + this.pillTextValue.length * numAdjacentPills);
      modelExpects.call(this, 'hello test world', 'hello test world');
    });

    if (numAdjacentPills > 1) {
      it('should insert ' + pillDescription + ' and remove the last one', function() {
        var startValue = 'hello world';
        var caretPos = 6;
        var resultPillText = '';
        var resultPillHtml = '';
        var pills = [];

        basicPillTest.call(this, startValue, caretPos, numAdjacentPills);

        for (var i = 0; i < numAdjacentPills - 1; i++) {
          pills.push(createPill.call(this, caretPos + this.pillTextValue.length * i));
          resultPillText += this.pillTextValue;
          resultPillHtml += this.pillHtmlValue;
        }

        var startSel = caretPos + resultPillText.length;
        simulateTypingOfString.call(this, 'test ', startSel, startSel + this.pillTextValue.length);
        modelExpects.call(this, 'hello ' + resultPillText + 'test world', 'hello ' + resultPillHtml + 'test world', pills);
      });

      it('should insert ' + pillDescription + ' and remove the first one', function() {
        var startValue = 'hello world';
        var caretPos = 6;
        var resultPillText = '';
        var resultPillHtml = '';
        var replacementText = 'test';
        var pills = [];

        basicPillTest.call(this, startValue, caretPos, numAdjacentPills);

        for (var i = 0; i < numAdjacentPills - 1; i++) {
          //replacementText.length + 1 (+ 1 is for a space)
          pills.push(createPill.call(this, caretPos + (replacementText.length + 1) + this.pillTextValue.length * i));
          resultPillText += this.pillTextValue;
          resultPillHtml += this.pillHtmlValue;
        }

        simulateTypingOfString.call(this, replacementText, caretPos, caretPos + this.pillTextValue.length - 1);
        modelExpects.call(this, 'hello test ' + resultPillText + 'world', 'hello test ' + resultPillHtml + 'world', pills);
      });
    }

    if (numAdjacentPills === 3) {
      it('should insert 3 @refs and remove the middle one', function() {
        var startValue = 'hello world';
        var caretPos = 6;
        var replacementText = 'test ';
        var pills = [];

        basicPillTest.call(this, startValue, caretPos, numAdjacentPills);

        pills.push(createPill.call(this, caretPos));
        pills.push(createPill.call(this, caretPos + this.pillTextValue.length + replacementText.length));

        var startSel = caretPos + this.pillTextValue.length;

        simulateTypingOfString.call(this, 'test', startSel, startSel + this.pillTextValue.length - 1);
        modelExpects.call(this, 'hello ' + this.pillTextValue + replacementText + this.pillTextValue + 'world', 'hello ' + this.pillHtmlValue + replacementText + this.pillHtmlValue + 'world', pills);
      });
    }
  }

  for (var numAdjacentPills = 1; numAdjacentPills < 4; numAdjacentPills++) {
    doAdjacentPillTests(numAdjacentPills);
  }

  function doRemoveAtRefTests(deletionChar) {

    it('should dereference @ reference on input when the selectionStart is within it and the selectionEnd is at the end of the input value', function() {
      var startText = 'hello world';
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);

      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || ' universe', 11, (startText + this.pillTextValue).length);

      var expected = 'hello @test' + (deletionChar ? '' : ' universe');
      modelExpects.call(this, expected, expected);
    });

    it('should dereference 1 @ reference on input when the selectionStart is within it and the selectionEnd is at the end of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello world';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || ' universe', 11, startText.length + this.pillTextValue.length * 2);

      var expected = 'hello @test' + (deletionChar ? '' : ' universe');
      modelExpects.call(this, expected, expected);
    });

    it('should dereference 1 @ reference on input when the selectionEnd is within it and the selectionStart is at the beginning of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello test';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'passing', 0, 6 + this.pillTextValue.length + 5);

      var expected = (deletionChar ? '' : 'passing') + ' at reference test';
      modelExpects.call(this, expected, expected);
    });

    it('should dereference @ reference on input when the selectionStart is within it and the selectionEnd is NOT at the end of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello testing';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || ' winn', 11, (startText + this.pillTextValue).length - 3);

      var expected = 'hello @test' + (deletionChar ? '' : ' winn') + 'ing';
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selectionStart is on the left edge of the @ref and the selectionEnd is at the end of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello world';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'universe', 6, (startText + this.pillTextValue).length);

      var expected = 'hello ' + (deletionChar ? '' : 'universe');
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selectionStart is on the left edge of the @ref and the selectionEnd is NOT at the end of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello testing';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'winn', 6, (startText + this.pillTextValue).length - 3);

      var expected = 'hello ' + (deletionChar ? '' : 'winn') + 'ing';
      modelExpects.call(this, expected, expected);
    });

    it('should dereference @ref on input when the selectionEnd is within it and the selectionStart is at the beginning of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello test';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'passing', 0, 11);

      var expected = (deletionChar ? '' : 'passing') + ' at reference test';
      modelExpects.call(this, expected, expected);
    });

    it('should dereference @ reference on input when the selectionEnd is within it and the selectionStart is NOT at the beginning of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello test';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'p me', 3, 11);

      var expected = 'hel' + (deletionChar ? '' : 'p me') + ' at reference test';
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selectionEnd is on the right edge of the @ref and the selectionStart is at the beginning of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello world';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'what\'s up', 0, 6 + this.pillTextValue.length - 1);

      var expected = (deletionChar ? '' : 'what\'s up') + ' world';
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selectionEnd is on the left edge of the @ref and the selectionStart is NOT at the beginning of the input value', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello world';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'p me', 3, 6 + this.pillTextValue.length - 1);

      var expected = 'hel' + (deletionChar ? '' : 'p me') + ' world';
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selection range is equal to the @ref edges', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      var startText = 'hello world';
      simulateTypingOfString.call(this, startText);
      setSelectionRange.call(this, 6, 6); //set caret to place @ ref after 'hello '
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'test', 6, 6 + this.pillTextValue.length - 1);

      var expected = 'hello ' + (deletionChar ? '' : 'test') + ' world';
      modelExpects.call(this, expected, expected);
    });

    it('should remove @ref on input when the selection range is equal to the @ref edges and was only content', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      insertPill.call(this);
      simulateTypingOfString.call(this, deletionChar || 'test', 0, this.pillTextValue.length - 1);

      var expected = (deletionChar ? '' : 'test') + ' ';
      modelExpects.call(this, expected, expected);
    });
  }

  doRemoveAtRefTests(null);
  doRemoveAtRefTests(backspaceChar);
  doRemoveAtRefTests(deleteChar);


  it('should insert @ reference by replacing selection range', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    var pills = [createPill.call(this, 6)];
    simulateTypingOfString.call(this, 'hello test world');
    setSelectionRange.call(this, 6, 11);
    insertPill.call(this, pills[0], 11);

    modelExpects.call(this, 'hello ' + this.pillTextValue + 'world', 'hello ' + this.pillHtmlValue + 'world', pills);
  });

  it('should dereference @ref on single word deletion to the left', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);

    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 8, {
      ctrlKey: !isMacOS,
      altKey: isMacOS
    }, '@test at ');

    modelExpects.call(this, '@test at ', '@test at ');
  });

  it('should dereference @ref on single word deletion to the right', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    simulateTypingOfString.call(this, ' ');
    insertPill.call(this);
    setSelectionRange.call(this, 0);

    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 46, {
      ctrlKey: !isMacOS,
      altKey: isMacOS
    }, ' at reference');

    modelExpects.call(this, ' at reference', ' at reference');
  });

  it('should remove text before an @ref using forward DELETE', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    simulateTypingOfString.call(this, ' ');
    var ref = insertPill.call(this);
    setSelectionRange.call(this, 0);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 46, null, this.pillTextValue);
    ref.positionStart = 0;
    modelExpects.call(this, this.pillTextValue, this.pillHtmlValue, [ref]);
  });

  if (isMacOS) {
    it('should focus @ref on bordering backspace', function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      insertPill.call(this);
      setSelectionRange.call(this, this.pillTextValue.length - 1);
      triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 8, {
        ctrlKey: !isMacOS,
        altKey: isMacOS
      });
      expect(document.activeElement.matches('.js-piller-pill')).toBeTruthy();
    });
  }

  it('should focus @ref on bordering left arrow', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);
    setSelectionRange.call(this, this.pillTextValue.length - 1);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 37);
    expect(document.activeElement.matches('.js-piller-pill')).toBeTruthy();
  });

  it('should focus @ref on bordering right arrow', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);
    setSelectionRange.call(this, 0);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 39);
    expect(document.activeElement.matches('.js-piller-pill')).toBeTruthy();
  });

  it('should focus @ref on bordering delete', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);
    setSelectionRange.call(this, 0);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 46);
    expect(document.activeElement.matches('.js-piller-pill')).toBeTruthy();
  });

  it('should focus the correct (first) @ref when there are more than one of the same', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);
    simulateTypingOfString.call(this, 'hello ', this.pillTextValue.length);
    insertPill.call(this);
    setSelectionRange.call(this, 0);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 39);

    expect(document.activeElement.matches('.js-piller-pill:first-child')).toBeTruthy();
  });

  it('should focus the correct (last) @ref when there are more than one of the same', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    var middleText = 'hello ';
    insertPill.call(this);
    simulateTypingOfString.call(this, middleText, this.pillTextValue.length);
    insertPill.call(this);
    setSelectionRange.call(this, middleText.length + this.pillTextValue.length);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 39);

    expect(document.activeElement.matches('.js-piller-pill:last-child')).toBeTruthy();
  });

  function doKeyNavOffAtReferenceTests(keyCode, isAfter, eventExtras) {
    it('should move caret ' + (isAfter ? 'after' : 'before') + ' focused @ref on ' + keyCode, function() {
      this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
      insertPill.call(this);
      setSelectionRange.call(this, 0);
      debugger;

      triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 39); //focus the inserted at ref
      triggerKeyEvents.call(this, document.activeElement, 0, keyCode, eventExtras);

      expect(document.activeElement === this.pillerInstance.ui.textarea).toBeTruthy();
      expect(this.pillerInstance.ui.textarea.selectionStart).toBe(isAfter ? this.pillTextValue.length - 1 : 0);
    });
  }

  // triggering keyevents on the pills is not working for some reason

  // doKeyNavOffAtReferenceTests(39, true);
  // doKeyNavOffAtReferenceTests(40, true);
  // doKeyNavOffAtReferenceTests(9, true);
  // doKeyNavOffAtReferenceTests(37, false);
  // doKeyNavOffAtReferenceTests(38, false);
  // doKeyNavOffAtReferenceTests(9, false, {
  //   shiftKey: true
  // });

  function doRemoveFocusedRefPillTest(keyCode, addAdjacentRef) {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    insertPill.call(this);

    if (addAdjacentRef) {
      insertPill.call(this);
    }

    setSelectionRange.call(this, 0);
    triggerKeyEvents.call(this, this.pillerInstance.ui.textarea, 0, 39); //focus the inserted at ref
    triggerKeyEvents.call(this, document.activeElement, 0, keyCode);
  }

  // triggering keyevents on the pills is not working for some reason

  // [8, 46].forEach(function(keyCode) {
  //   it('should remove focused @ref pill on ' + keyCode, function() {
  //     doRemoveFocusedRefPillTest.call(this, keyCode);
  //     expect(document.activeElement === this.pillerInstance.ui.textarea).toBeTruthy();
  //     modelExpects.call(this, ' ', ' ');
  //   });

  //   it('should remove first focused @ref with backspace when there is an adjacent @ref', function() {
  //     doRemoveFocusedRefPillTest.call(this, keyCode, true);
  //     modelExpects.call(this, ' ' + this.pillTextValue, ' ' + this.pillHtmlValue, [createPill.call(this, 1)]);
  //   });

  //   it('should set caret at position start of removed focused @ref pill on ' + keyCode, function() {
  //     doRemoveFocusedRefPillTest.call(this, keyCode);
  //     expect(this.pillerInstance.ui.textarea.selectionStart).toBe(0);
  //   });
  // });

  it('should set initial model value from client', function() {
    var startText = 'hello model world ';
    var text = startText + this.pillTextValue + this.pillTextValue;
    var pill1 = createPill.call(this, startText.length);
    var pill2 = createPill.call(this, pill1.positionEnd + 1);
    var pills = [pill1, pill2];
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    this.pillerInstance.modelValue = this.pillerInstance.createModelValue(text, pills);

    modelExpects.call(this, text, startText + this.pillHtmlValue + this.pillHtmlValue, pills);
  });

  // DEPRECATED
  // it('should reset model when the storageId changes', function() {
  //   var text = 'hello model world ';
  //   this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
  //   this.pillerInstance.modelValue = this.pillerInstance.createModelValue(text, []);
  //   flushTimers();
  //   this.defaultOptions.storageId = 'newStorageId';
  //   flushTimers();
  //   modelExpects.call(this, '', '');
  // });

  // it('should set model to storage value of new model when the storageId changes', function() {
  //   var text = 'hello model world ';
  //   this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
  //   this.pillerInstance.modelValue = this.pillerInstance.createModelValue(text, []);
  //   var originalStorageId = this.defaultOptions.storageId;
  //   this.defaultOptions.storageId = 'newStorageId';
  //   flushTimers();
  //   this.defaultOptions.storageId = originalStorageId;
  //   flushTimers();
  //   modelExpects.call(this, text, text);
  // });

  it('should reset model when set to a falsey value', function() {
    var text = 'hello model world ';
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    this.pillerInstance.modelValue = this.pillerInstance.createModelValue(text, []);
    this.pillerInstance.modelValue = null;
    flushTimers();
    modelExpects.call(this, '', '');
  });

  it('should always have the at reference ranges sorted by positionStart when adding @refs', function() {
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);
    var ref2 = createPill.call(this, 0, {
      id: 'ref2',
      name: 'ref2'
    }, 'ref2');
    var ref3 = createPill.call(this, ref2.text.length + 1, {
      id: 'ref3',
      name: 'ref3'
    }, 'ref3');
    var ref1 = createPill.call(this, ref2.text.length + ref3.text.length + 2, {
      id: 'ref1',
      name: 'ref1'
    }, 'ref1');

    var ref1Html = ref1.html + ' ';
    var ref2Html = ref2.html + ' ';
    var ref3Html = ref3.html + ' ';

    insertPill.call(this, ref1);
    setSelectionRange.call(this, 0);
    insertPill.call(this, ref2);
    setSelectionRange.call(this, ref2.text.length + 1);
    insertPill.call(this, ref3);

    modelExpects.call(this, ref2.text + ' ' + ref3.text + ' ' + ref1.text + ' ', ref2Html + ref3Html + ref1Html, [ref2, ref3, ref1]);
  });

  it('should add an @ref that matches a query without @', function() {
    var ref1 = createPill.call(this, 0, {
      id: 'ref1',
      name: 'ref1'
    }, 'ref1');
    var ref1Html = ref1.html + ' ';
    this.pillerInstance = piller.create(this.container, [], this.defaultOptions);

    insertPill.call(this, ref1);

    modelExpects.call(this, ref1.text + ' ', ref1Html, [ref1]);
  });

  it('should add adjacent @refs that are the same instance and matches a query without @', function() {
    var ref1 = createPill.call(this, 0, {
      id: 'ref1',
      name: 'ref1'
    }, 'ref1');
    var ref1Html = ref1.html + ' ';
    this.pillerInstance = piller.create(this.container, [ref1], this.defaultOptions);

    insertPill.call(this, ref1);
    insertPill.call(this, ref1);

    var clone = ref1.clone();
    var clone2 = ref1.clone();
    clone.positionStart = 0;
    clone2.positionStart = ref1.text.length + 1;

    modelExpects.call(this, ref1.text + ' ' + ref1.text + ' ', ref1Html + ref1Html, [clone, clone2]);
  });

});