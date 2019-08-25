'use strict'
// TODO: Consider using nodegit instead
import childProcess from 'child_process'
import path from 'path'
import findUp from 'find-up'
import Git from 'nodegit'

const GIT_PREFIX = 'git'

// const DEBUG = false

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
    this.serverless = serverless
    this.resolvedValues = {}
    const delegate = serverless.variables.getValueFromSource.bind(serverless.variables)

    serverless.variables.getValueFromSource = (variableString) => {
      if (variableString.startsWith(`${GIT_PREFIX}:`)) {
        const variable = variableString.split(`${GIT_PREFIX}:`)[1]
        return this._getValue(variable)
      }

      return delegate(variableString)
    }

    this.gitRepoDir = null

    this.hooks = {
      'after:package:initialize': this.exportGitVariables.bind(this),
      'before:offline:start': this.exportGitVariables.bind(this),
      'before:offline:start:init': this.exportGitVariables.bind(this)
    }
  }

  async _getGitRepoDir() {
    if (!this.gitRepoDir) {
      // Source = find-up readme:
      //   https://github.com/sindresorhus/find-up
      this.gitRepoDir = await findUp(async directory => {
        const hasGit = await findUp.exists(path.join(directory, '.git'))
        return hasGit && directory
      }, {type: 'directory'})
    }
    return this.gitRepoDir || process.cwd()
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
        value = await _exec('git describe --always')
        break
      case 'describeLight':
        value = await _exec('git describe --always --tags')
        break
      case 'sha1':
        value = await _exec('git rev-parse --short HEAD')
        break
      case 'commit': {
        const gitRepoDir = await this._getGitRepoDir()
        const repo = await Git.Repository.open(gitRepoDir)
        const commit = await repo.getHeadCommit()
        value = commit.sha()
        break
      }
      case 'branch': {
        const gitRepoDir = await this._getGitRepoDir()
        const repo = await Git.Repository.open(gitRepoDir)
        const ref = await repo.getCurrentBranch()
        value = ref.shorthand()
        break
      }
      case 'message': {
        const gitRepoDir = await this._getGitRepoDir()
        const repo = await Git.Repository.open(gitRepoDir)
        const commit = await repo.getHeadCommit()
        value = (await commit.message() || '').trim()
        break
      }
      case 'isDirty': {
        const gitRepoDir = await this._getGitRepoDir()
        const repo = await Git.Repository.open(gitRepoDir)
        const changes = await repo.getStatus()
        // DEBUG && await verboseIsDirty(changes)
        value = `${changes.length > 0}`
        break
      }
      case 'repository': {
        const gitRepoDir = await this._getGitRepoDir()
        // DEBUG && await verboseRepository(gitRepoDir)
        value = path.basename(gitRepoDir)
        break
      }
      default:
        throw new Error(`Git variable ${variable} is unknown. Candidates are 'describe', 'describeLight', 'sha1', 'commit', 'branch', 'message', 'repository'`)
    }

    // TODO: Figure out why if I don't log, the deasync promise
    // never resolves. Catching it in the debugger or logging
    // causes it to work fine.
    process.stdout.write('')

    // Cache before returning
    this.resolvedValues[variable] = value
    return value
  }

  async exportGitVariables() {
    const exportGitVariables = this.serverless.service.custom && this.serverless.service.custom.exportGitVariables
    if (exportGitVariables === false) {
      return
    }

    const sha1 = await this._getValue('sha1')
    const commit = await this._getValue('commit')
    const branch = await this._getValue('branch')
    const isDirty = await this._getValue('isDirty')
    const repository = await this._getValue('repository')

    for (const functionName of this.serverless.service.getAllFunctions()) {
      const func = this.serverless.service.getFunction(functionName)

      this.exportGitVariable(func, 'GIT_COMMIT_SHORT', sha1)
      this.exportGitVariable(func, 'GIT_COMMIT_LONG', commit)
      this.exportGitVariable(func, 'GIT_BRANCH', branch)
      this.exportGitVariable(func, 'GIT_IS_DIRTY', isDirty)
      this.exportGitVariable(func, 'GIT_REPOSITORY', repository)
    }
  }

  exportGitVariable(func, variableName, gitValue) {
    if (!func.environment) {
      func.environment = {}
    }

    if (!func.environment[variableName]) {
      func.environment[variableName] = gitValue
    }

    if (!func.tags) {
      func.tags = {}
    }

    if (!func.tags[variableName]) {
      func.tags[variableName] = gitValue
    }
  }
}

// async function verboseIsDirty(changes) {
//   console.log('isDirty checking', process.cwd())
//   // console.log(await _exec('ls -la'))
//   // console.log(await _exec('git status --porcelain'))
//   if (changes.length > 0) {
//     console.log('  changes:', changes.map(file => `${file.path()} - ${statusToText(file)}`))
//   } else {
//     console.log('  no changes')
//   }
// }
//
// async function verboseRepository(gitRepoDir) {
//   console.log('Repository location by method:')
//   console.log('  git rev-parse:', await _exec('git rev-parse --show-toplevel'))
//   console.log('  find-up:      ', gitRepoDir)
// }
//
// Utility function to format results of getStatus()
// function statusToText(status) {
//   var words = []
//   if (status.isNew()) { words.push('NEW') }
//   if (status.isModified()) { words.push('MODIFIED') }
//   if (status.isTypechange()) { words.push('TYPECHANGE') }
//   if (status.isRenamed()) { words.push('RENAMED') }
//   if (status.isIgnored()) { words.push('IGNORED') }
//
//   return words.join(' ')
// }
