const TestRenderer = require('react-test-renderer');

module.exports = {
  ...TestRenderer,
  createRoot: function (options) {
    let instance = null;
    return {
      render(element) {
        if (!instance) {
          instance = TestRenderer.create(element, options);
        } else {
          instance.update(element);
        }
      },
      unmount() {
        if (instance) {
          instance.unmount();
        }
      },
      get container() {
        return instance;
      },
    };
  },
};
