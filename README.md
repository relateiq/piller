[![npm][npm-badge]][npm-badge-url]
[npm-badge]: https://img.shields.io/npm/v/piller.svg
[npm-badge-url]: https://www.npmjs.com/package/piller

# Piller

Piller turns a normal textarea into a flexible typeahead that can search different data sets and display the selection as a pill of text within the textarea. This was inspired by the implementation of Facebook's comment box at-referencing.

##Implementation
The way piller displays the pills is a bit of an illusion. A "decorator" element is perfectly overlaid on top of a textarea. This decorator has `pointer-events: none` set as a CSS style which allows mouse events to fall through to the textarea below. As the user types into the textarea, every key stroke is captured and recreated as HTML within the decorator such that every character is perfectly aligned between the decorator and the textarea. In order to prevent fuzzy or darker than expected font display, the decorator has the `color: transparent` style applied. When a pill is added, piller stores meta data containing the start index and end index where the pill should be positioned in respect to the plain text value. Using these indexes, piller creates an HTML element inside the decorator to display the pill style at the perfect position. Every pill element in the decorator has `pointer-events: all` to capture mouse events and focus, and `color: initial` to display the text within the pill.

##Install piller

```
npm install --save piller
```

##Usage
```
var piller = require('piller');

var pillerInstance = piller.create(containerElement, pillCorpus, options, optionalTextarea);
```

*containerElement*:
- HTML Element to build piller within.
- Note: this element needs to be exclusively devoted to piller (e.g. don't use document.body)

*pillCorpus*:
- Array of *pills* that can be searched, selected, and turned into a pill
- See below on how to create a pill

*options*: object to configure piller with the following properties
- *scrollable*: allows the container to scroll if value is truthy
- *excludeStoredPillsNotFoundInCorpus*: disregards pill found within a *pillerModelValue* (see below) that are not found in the pillCorpus
- *searchDebounceTime*: time in milliseconds to debounce searching behavior on every text input
- *storageKey*: the string key to retrieve and store model values via the *storageService*
- *storageInterface*: defaults to *localStorage*. Supplies a custom object for caching model values by *storageKey*.
- *onModelChange*: callback when the model value changes. Receives the model as a parameter.
- *showSearchMatches*: callback to display the current typeahead results however you want. Receives an array of pills that match the search as a parameter.

*optionalTextarea*: optionally passed textarea that piller will use instead of creating its own

###pillerInstance

`piller.create(...)` from the example above returns a `pillerInstance` object with the following interface:

- *ui*: object with references to the elements used by piller. Properties include *container*, *decorator*, and *textarea*
- *selectSearchMatch*: callback to tell piller what pill to select from with search matches provided to *showSearchMatches* (see above)
- *destroy*: cleans up any timeouts and intervals used by piller internally
- *getPillSearchMatches*: returns the array of pills that match the current search at any given time
- *reset*: resets the model value (potentially retrieving a model value from storage)
- *update*: updates the model value with a provided value or re-synchronizes the textarea and decorator
- *createModelValue*: creates a *pillerModelValue* for this piller instance (see below for details

###pills

A pill can be created throug the `piller.createPill(...)` function as follows

```
var piller = require('piller');

var pill = piller.createPill(id, value, displayText, position, options);
```

*id*: unique id for this pill, determined by you
*value*: data value to associate with this pill
*displayText*: the text to display in the textarea when this pill is selected
*position*: the starting index of this pill relative to the plain text value of the textarea
*options*: object of options containing:
- *searchText*: the text value used to determine if the input is a match during search
- *searchPrefix*: a string that groups and matches pills during search (e.g. '@' will show all at-referencable pills)
- *prefix*: string prefix to prepend to *displayText* on selection
- *suffix*: string suffix to append to *displayText* on selection
- *caretPositionFromEnd*: integer offset to place the caret after selection (defaults to 0). Negative values move left. Positive values move right
- *minSearchCharacters*: minimum characters needed to do a free-text search (i.e. without the searchPrefix)
- *maxSearchWords*: the max amount of words before the caret to search (e.g. 3 === search the last 3 words for a match)
- *className*: custom classes to add to the pill element


###pillerModelValue
A piller model value can be created like so:

```
var piller = require('piller');

var pillerInstance = piller.create(containerElement, pillCorpus, options, optionalTextarea);

var modelValue = pillerInstance.createModelValue(text, pills);
```

where the parameters are as follows:

*text*: is the plaintext value for the textarea
*pills*: is an array of pills that pertain to the given text value

The `modelValue` object that is return implements the following interface:
*clearPills*: removes all pills from the modelValue (and updates the UI)
*setPills*: takes an array of pills to set on the modelValue and overwrites the existing pills (and updates the UI)
*addPill*: adds a single pill to the modelValue (and updates the UI).
- Also, takes `optionalEndIndex` as a second parameter to tell piller to replace existing text with this pill up until that index
*removePill*: removes a pill by reference from the modelValue (and updates the UI)
*getPills*: returns the array of pills that exist on the modelValue at that point in time
