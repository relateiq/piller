module.exports = pillerModelValue;

function pillerModelValue(updateFn, text, pills) {
    var instance = {
        _isPillerModelValue: true,
        _pills: [],
        text: text || ''
    };

    instance.clearPills = clearPills.bind(instance, updateFn);
    instance.setPills = setPills.bind(instance, updateFn);
    instance.addPill = addPill.bind(instance);
    instance.removePill = removePill.bind(instance);
    instance.getPills = getPills.bind(instance);

    instance._updateRanges = updateRanges.bind(instance);

    instance.setPills(pills);

    return instance;
}

function getPills() {
    return this._pills;
}

function setPills(updateFn, pills) {
    if (Array.isArray(pills)) {
        this._pills = sortPills(pills.slice());
        updateFn();
    } else {
        this.clearPills();
    }
}

function addPill(pill, optionalEndIndex) {
    if (~this._pills.indexOf(pill)) {
        pill = pill.clone();
    }

    if (typeof pill.positionStart !== 'number' || pill.positionStart > this.text.length) {
        pill.positionStart = this.text.length;
    }

    if (typeof optionalEndIndex !== 'number') {
        optionalEndIndex = pill.positionStart;
    }

    var insertedText = pill.text + pill.suffix;
    var toEndOfNewVal = this.text.substring(0, pill.positionStart) + insertedText;

    this.text = toEndOfNewVal + this.text.substring(optionalEndIndex);
    this._updateRanges(pill.positionStart, optionalEndIndex, insertedText.length, pill);

    return toEndOfNewVal.length + pill.caretPositionFromEnd;
}

function removePill(pill) {
    var pillIndex = this._pills.indexOf(pill);

    if (~pillIndex) {
        this._pills.splice(pillIndex, 1);
        this.text = this.text.substring(0, pill.positionStart) + this.text.substring(pill.positionEnd);
        this._updateRanges(pill.positionStart, pill.positionEnd, 0);
    }
}

function clearPills(updateFn) {
    if (this._pills.length) {
        this._pills.length = 0;
        updateFn();
    }
}

function sortPills(pills) {
    return pills.sort(function(a, b) {
        return a.positionStart - b.positionStart;
    });
}

function updateRanges(changeStart, changeEnd, insertionCount, insertedPill) {
    var indexDelta = changeStart - changeEnd + (insertionCount || 0);
    var retainedPills = [];

    this._pills.forEach(function(pill) {
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

    if (insertedPill) {
        retainedPills.push(insertedPill);
    }

    this.setPills(retainedPills);
}