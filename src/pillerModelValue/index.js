module.exports = pillerModelValue;

function pillerModelValue(text, pills) {
  var instance = {
    _pills: [],
    text: text || ''
  };

  instance.clearPills = clearPills.bind(instance);
  instance.setPills = setPills.bind(instance);
  instance.addPill = addPill.bind(instance);
  instance.getPills = getPills.bind(instance);
  instance.removePill = removePill.bind(instance);

  instance.setPills(pills);
}

function getPills() {
  return this._pills;
}

function setPills(pills) {
  if (Array.isArray(pills)) {
    this._pills = sortPills(pills.slice());
  } else {
    this.clearPills();
  }
}

function addPill(pill) {
  this._pills.push(pill);
  this._pills = sortPills(this._pills);
}

function removePill(pill) {
  var pillIndex = this._pills.indexOf(pill);

  if (~pillIndex) {
    this._pills.splice(pillIndex, 1);
  }
}

function clearPills() {
  this._pills.length = 0;
}

function sortPills(pills) {
  return pills.sort(function(a, b) {
    return a.positionStart - b.positionStart;
  });
}