"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _child_process = _interopRequireDefault(require("child_process"));

var _path = _interopRequireDefault(require("path"));

var _os = _interopRequireDefault(require("os"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: Consider using nodegit instead
const GIT_PREFIX = 'git';

async function _exec(cmd, options = {
  timeout: 1000
}) {
  return new Promise((resolve, reject) => {
    _child_process.default.exec(cmd, options, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

class ServerlessGitVariables {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.resolvedValues = {};

    const getValue = this._getValue.bind(this);

    this.configurationVariablesSources = {
      [GIT_PREFIX]: {
        async resolve({
          address,
          params,
          resolveConfigurationProperty,
          options
        }) {
          return {
            value: await getValue(address)
          };
        }

      }
    }; // Kick this off optimistically on construction, and then also hook it when necessary
    // Once resolved once, the call is a very fast

    this.exportGitVariables();
    this.hooks = {
      'before:print:print': async () => this.exportGitVariables(),
      'after:package:initialize': async () => this.exportGitVariables(),
      'before:offline:start': async () => this.exportGitVariables(),
      'before:offline:start:init': async () => this.exportGitVariables()
    };
  }

  async _getValue(variable) {
    if (this.resolvedValues[variable]) {
      return this.resolvedValues[variable];
    }

    return this._getValueFromGit(variable);
  }

  async _getValueFromGit(variable) {
    let value = null;

    switch (variable) {
      case 'describe':
        value = await _exec('git describe --always');
        break;

      case 'describeLight':
        value = await _exec('git describe --always --tags');
        break;

      case 'sha1':
        value = await _exec('git rev-parse --short HEAD');
        break;

      case 'commit':
        value = await _exec('git rev-parse HEAD');
        break;

      case 'branch':
        value = await _exec('git rev-parse --abbrev-ref HEAD');
        break;

      case 'message':
        value = await _exec('git log -1 --pretty=%B');
        break;

      case 'messageSubject':
        value = await _exec('git log -1 --pretty=%s');
        break;

      case 'messageBody':
        value = await _exec('git log -1 --pretty=%b');
        break;

      case 'user':
        value = await _exec('git config user.name');
        break;

      case 'email':
        value = await _exec('git config user.email');
        break;

      case 'isDirty':
        {
          const changes = await _exec('git diff --stat');
          value = `${changes.length > 0}`;
          break;
        }

      case 'repository':
        {
          const pathName = await _exec('git rev-parse --show-toplevel');
          value = _path.default.basename(pathName);
          break;
        }

      case 'tags':
        value = await _exec('git tag --points-at HEAD');
        value = value.split(_os.default.EOL).join('::');

        if (value === '') {
          value = await _exec('git rev-parse --short HEAD');
        }

        break;

      default:
        throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'describeLight', 'sha1', 'commit', 'branch', 'message', 'messageSubject', 'messageBody', 'user', 'email', 'isDirty', 'repository', 'tags'`);
    } // TODO: Figure out why if I don't log, the deasync promise
    // never resolves. Catching it in the debugger or logging
    // causes it to work fine.


    process.stdout.write(''); // Cache before returning

    this.resolvedValues[variable] = value;
    return value;
  }

  async exportGitVariables() {
    const exportGitVariables = this.serverless.service.custom && this.serverless.service.custom.exportGitVariables;
    const envWhitelist = this.serverless.service.custom && this.serverless.service.custom.gitVariablesEnvWhitelist;
    const tagsWhitelist = this.serverless.service.custom && this.serverless.service.custom.gitVariablesTagsWhitelist;

    if (exportGitVariables === false) {
      return;
    }

    const exportList = [{
      value: 'sha1',
      variableName: 'GIT_COMMIT_SHORT'
    }, {
      value: 'commit',
      variableName: 'GIT_COMMIT_LONG'
    }, {
      value: 'branch',
      variableName: 'GIT_BRANCH'
    }, {
      value: 'isDirty',
      variableName: 'GIT_IS_DIRTY'
    }, {
      value: 'repository',
      variableName: 'GIT_REPOSITORY'
    }, {
      value: 'tags',
      variableName: 'GIT_TAGS'
    }];

    for (const functionName of this.serverless.service.getAllFunctions()) {
      const func = this.serverless.service.getFunction(functionName);

      for (const {
        value,
        variableName
      } of exportList) {
        const setOnEnv = !envWhitelist || envWhitelist.includes(variableName);
        const setOnTags = !tagsWhitelist || tagsWhitelist.includes(variableName);

        if (!setOnEnv && !setOnTags) {
          continue;
        }

        const gitValue = await this._getValue(value);
        this.exportGitVariable(func, variableName, gitValue, setOnEnv, setOnTags);
      }
    }
  }

  exportGitVariable(func, variableName, gitValue, setOnEnv = true, setOnTags = true) {
    if (setOnEnv) {
      if (!func.environment) {
        func.environment = {};
      }

      if (!func.environment[variableName]) {
        func.environment[variableName] = gitValue;
      }
    }

    if (setOnTags) {
      if (!func.tags) {
        func.tags = {};
      }

      if (!func.tags[variableName]) {
        func.tags[variableName] = gitValue;
      }
    }
  }

}

exports.default = ServerlessGitVariables;
module.exports = exports.default;