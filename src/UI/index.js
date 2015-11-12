require('../scss/piller.scss');

module.exports = initUI;

function initUI(container, props, optionalTextarea) {
  var result = {
    container: container,
    decorator: createDecorator(container),
    textarea: createTextarea(container, optionalTextarea)
  };

  container.classList.add('piller');

  if (props.options.scrollable) {
    container.classList.add('piller-scrollable');
  }

  return result;
}

function createDecorator(container) {
  var decorator = document.createElement('div');
  decorator.classList.add('piller-decorator');
  container.appendChild(decorator);
  return decorator;
}

function createTextarea(container, optionalTextarea) {
  var textarea = optionalTextarea || document.createElement('textarea');
  textarea.classList.add('piller-textarea');
  container.appendChild(textarea);
  return textarea;
}