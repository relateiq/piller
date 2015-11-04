require('../scss/piller.scss');

module.exports = initUI;

function initUI(container) {
  var result = {
    container: container,
    decorator: createDecorator(container),
    textarea: createTextarea(container)
  };

  container.classList.add('piller');

  return result;
}

function createDecorator(container) {
  var decorator = document.createElement('div');
  decorator.classList.add('piller-decorator');
  container.appendChild(decorator);
  return decorator;
}

function createTextarea(container) {
  var textarea = document.createElement('div');
  textarea.classList.add('piller-textarea');
  container.appendChild(textarea);
  return textarea;
}