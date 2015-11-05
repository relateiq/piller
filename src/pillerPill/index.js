var unidecode = require('unidecode');

module.exports = pillerPill;

function pillerPill(id, value, displayText, position, options) {
  if (arguments.length === 1) {
    return clone.call(arguments[0]);
  }

  options = options || {};
  options.searchText = options.searchText || displayText;

  var instance = {
    id: id,
    value: value,
    searchText: options.searchText && unidecode(options.searchText) || '',
    searchPrefix: options.searchPrefix || '',
    prefix: options.prefix || '',
    suffix: options.suffix || '',
    caretPositionFromEnd: options.caretPositionFromEnd || 0,
    minSearchCharacters: options.minSearchCharacters || 0,
    maxSearchWords: options.maxSearchWords || 1
  };
  var text, className, positionStart;

  Object.defineProperties(instance, {
    text: {
      enumerable: true,
      get: function() {
        return text;
      },
      set: function(val) {
        text = val || '';
        setHtml(instance);
      }
    },
    className: {
      enumerable: true,
      get: function() {
        return className;
      },
      set: function(val) {
        className = val || '';
        setHtml(instance);
      }
    },
    positionStart: {
      enumerable: true,
      get: function() {
        return positionStart;
      },
      set: function(posStart) {
        if (typeof posStart === 'number') {
          positionStart = posStart;
          instance.positionEnd = posStart + instance.text.length;
        }
      }
    }
  });

  instance.text = instance.prefix + (displayText || '');
  instance.className = options.className || '';
  instance.positionStart = position;
  setHtml(instance);

  instance.clone = clone.bind(instance);

  return instance;
}

function setHtml(instance) {
  instance.html = '<span class="piller-pill js-piller-pill ' + instance.className + '" tabindex="-1">' + instance.text + '</span>';
}

function clone() {
  var displayText;

  if (this.text) {
    var i = this.prefix && this.prefix.length || 0;
    displayText = this.text.substring(i);
  }

  return pillerPill(
    this.id,
    this.value,
    displayText,
    this.positionStart,
    this
  );
}