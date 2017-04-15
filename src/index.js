// TODO: Consider using nodegit instead
import deasyncPromise from 'deasync-promise'
import childProcess from 'child_process'

const GIT_PREFIX = 'git'

const resolvedValues = {}

async function getValueFromGit(variable) {
  if (resolvedValues[variable]) {
    return resolvedValues[variable]
  }

  function exec(cmd, options = { timeout: 1000 }) {
    return new Promise((resolve, reject) => {
      childProcess.exec(cmd, options, (err, stdout, stder) => {
        if (err) {
          reject(err)
        } else {
          resolve(stdout)
        }
      })
    })
  }

  switch (variable) {
    case 'describe':
      return exec('git describe')
    case 'sha1':
      return exec('git rev-parse --short')
    case 'branch':
      return exec('git rev-parse --abbrev-ref HEAD')
    default:
      throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'sha1', 'branch'`)
  }
}

export default class ServerlessGitVariables {
  constructor(serverless, options) {
    const delegate = serverless.variables.getValueFromSource.bind(serverless.variables)

    serverless.variables.getValueFromSource = (variableString) => {
      if (variableString.startsWith(`${GIT_PREFIX}:`)) {
        const variable = variableString.split(`${GIT_PREFIX}:`)[1]
        return deasyncPromise(getValueFromGit(variable))
      }

      return delegate(variableString)
    }
  }
}
