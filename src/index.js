// TODO: Consider using nodegit instead
import childProcess from 'child_process'

const GIT_PREFIX = 'git'

async function _exec(cmd, options = { timeout: 1000 }) {
  return new Promise((resolve, reject) => {
    childProcess.exec(cmd, options, (err, stdout) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

export default class ServerlessGitVariables {
  constructor(serverless, options) {
    this.resolvedValues = {}
    const delegate = serverless.variables.getValueFromSource.bind(serverless.variables)

    serverless.variables.getValueFromSource = (variableString) => {
      if (variableString.startsWith(`${GIT_PREFIX}:`)) {
        const variable = variableString.split(`${GIT_PREFIX}:`)[1]
        return this._getValue(variable)
      }

      return delegate(variableString)
    }
  }

  async _getValue(variable) {
    if (this.resolvedValues[variable]) {
      return Promise.resolve(this.resolvedValues[variable])
    }

    return this._getValueFromGit(variable)
  }

  async _getValueFromGit(variable) {
    let value = null
    switch (variable) {
      case 'describe':
        value = await _exec('git describe')
        break
      case 'sha1':
        value = await _exec('git rev-parse --short HEAD')
        break
      case 'branch':
        value = await _exec('git rev-parse --abbrev-ref HEAD')
        break
      case 'message':
        value = await _exec('git log -1 --pretty=%B')
        break
      default:
        throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'sha1', 'branch', 'message'`)
    }

    // TODO: Figure out why if I don't log, the deasync promise
    // never resolves. Catching it in the debugger or logging
    // causes it to work fine.
    process.stdout.write('')

    // Cache before returning
    this.resolvedValues[variable] = value
    return value
  }
}
