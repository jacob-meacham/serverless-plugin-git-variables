'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

let _exec = (() => {
  var _ref = (0, _asyncToGenerator3.default)(function* (cmd, options = { timeout: 1000 }) {
    return new _promise2.default(function (resolve, reject) {
      _child_process2.default.exec(cmd, options, function (err, stdout) {
        if (err) {
          reject(err);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  });

  return function _exec(_x) {
    return _ref.apply(this, arguments);
  };
})();

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const GIT_PREFIX = 'git'; // TODO: Consider using nodegit instead
class ServerlessGitVariables {
  constructor(serverless, options) {
    this.resolvedValues = {};
    const delegate = serverless.variables.getValueFromSource.bind(serverless.variables);

    serverless.variables.getValueFromSource = variableString => {
      if (variableString.startsWith(`${GIT_PREFIX}:`)) {
        const variable = variableString.split(`${GIT_PREFIX}:`)[1];
        return this._getValue(variable);
      }

      return delegate(variableString);
    };
  }

  _getValue(variable) {
    var _this = this;

    return (0, _asyncToGenerator3.default)(function* () {
      if (_this.resolvedValues[variable]) {
        return _promise2.default.resolve(_this.resolvedValues[variable]);
      }

      return _this._getValueFromGit(variable);
    })();
  }

  _getValueFromGit(variable) {
    var _this2 = this;

    return (0, _asyncToGenerator3.default)(function* () {
      let value = null;
      switch (variable) {
        case 'describe':
          value = yield _exec('git describe --always');
          break;
        case 'sha1':
          value = yield _exec('git rev-parse --short HEAD');
          break;
        case 'commit':
          value = yield _exec('git rev-parse HEAD');
          break;
        case 'branch':
          value = yield _exec('git rev-parse --abbrev-ref HEAD');
          break;
        case 'message':
          value = yield _exec('git log -1 --pretty=%B');
          break;
        default:
          throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'sha1', 'commit', 'branch', 'message'`);
      }

      // TODO: Figure out why if I don't log, the deasync promise
      // never resolves. Catching it in the debugger or logging
      // causes it to work fine.
      process.stdout.write('');

      // Cache before returning
      _this2.resolvedValues[variable] = value;
      return value;
    })();
  }
}
exports.default = ServerlessGitVariables;
module.exports = exports['default'];