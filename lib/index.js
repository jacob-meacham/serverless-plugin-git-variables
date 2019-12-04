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

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const GIT_PREFIX = 'git'; // TODO: Consider using nodegit instead
class ServerlessGitVariables {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.resolvedValues = {};
    const delegate = serverless.variables.getValueFromSource.bind(serverless.variables);

    serverless.variables.getValueFromSource = variableString => {
      if (variableString.startsWith(`${GIT_PREFIX}:`)) {
        const variable = variableString.split(`${GIT_PREFIX}:`)[1];
        return this._getValue(variable);
      }

      return delegate(variableString);
    };
    this.hooks = {
      'after:package:initialize': this.exportGitVariables.bind(this),
      'before:offline:start': this.exportGitVariables.bind(this),
      'before:offline:start:init': this.exportGitVariables.bind(this)
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
        case 'describeLight':
          value = yield _exec('git describe --always --tags');
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
        case 'isDirty':
          const writeTree = yield _exec('git write-tree');
          const changes = yield _exec(`git diff-index ${writeTree} --`);
          value = `${changes.length > 0}`;
          break;
        case 'repository':
          const pathName = yield _exec('git rev-parse --show-toplevel');
          value = _path2.default.basename(pathName);
          break;
        case 'tags':
          value = yield _exec('git tag --points-at HEAD');
          value = value.split(_os2.default.EOL).join(',');
          if (value === '') {
            value = yield _exec('git rev-parse --short HEAD');
          }
          break;
        default:
          throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'describeLight', 'sha1', 'commit', 'branch', 'message', 'repository'`);
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

  exportGitVariables() {
    var _this3 = this;

    return (0, _asyncToGenerator3.default)(function* () {
      const exportGitVariables = _this3.serverless.service.custom && _this3.serverless.service.custom.exportGitVariables;
      if (exportGitVariables === false) {
        return;
      }

      const sha1 = yield _this3._getValue('sha1');
      const commit = yield _this3._getValue('commit');
      const branch = yield _this3._getValue('branch');
      const isDirty = yield _this3._getValue('isDirty');
      const repository = yield _this3._getValue('repository');
      const gitTagsOrCommit = yield _this3._getValue('tags');

      for (const functionName of _this3.serverless.service.getAllFunctions()) {
        const func = _this3.serverless.service.getFunction(functionName);

        _this3.exportGitVariable(func, 'GIT_COMMIT_SHORT', sha1);
        _this3.exportGitVariable(func, 'GIT_COMMIT_LONG', commit);
        _this3.exportGitVariable(func, 'GIT_BRANCH', branch);
        _this3.exportGitVariable(func, 'GIT_IS_DIRTY', isDirty);
        _this3.exportGitVariable(func, 'GIT_REPOSITORY', repository);
        _this3.exportGitVariable(func, 'GIT_TAGS', gitTagsOrCommit);
      }
    })();
  }

  exportGitVariable(func, variableName, gitValue) {
    if (!func.environment) {
      func.environment = {};
    }

    if (!func.environment[variableName]) {
      func.environment[variableName] = gitValue;
    }

    if (!func.tags) {
      func.tags = {};
    }

    if (!func.tags[variableName]) {
      func.tags[variableName] = gitValue;
    }
  }
}
exports.default = ServerlessGitVariables;
module.exports = exports['default'];