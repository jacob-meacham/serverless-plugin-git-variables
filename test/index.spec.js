import test from 'ava'
import process from 'process'
import tmp from 'tmp'
import fs from 'fs-extra'
import path from 'path'
import Serverless from 'serverless'

import ServerlessGitVariables from '../src'

function buildSls() {
  const sls = new Serverless()
  sls.pluginManager.addPlugin(ServerlessGitVariables)
  sls.init()

  return sls
}

test.beforeEach(t => {
  t.context.initalDir = process.cwd()
})

test.beforeEach(t => {
  t.context.tmpDir = tmp.dirSync({unsafeCleanup: true}).name
})

test.afterEach.always(t => {
  process.chdir(t.context.initalDir)
})

test('Variables are passed through', async t => {
  const sls = buildSls()
  sls.service.custom.myVar = 'myVar'
  sls.service.custom.myResoledVar = '${self:custom.myVar}' // eslint-disable-line

  await sls.variables.populateService()
  t.is(sls.service.custom.myResoledVar, 'myVar')
})

test('Rejects on bad key', async t => {
  const sls = buildSls()
  sls.service.custom.myVar = '${git:badKey}' // eslint-disable-line
  await t.throws(sls.variables.populateService(), /Error: Git variable badKey is unknown.*/)
})

test.serial('Rejects on bad git command', async t => {
  process.chdir(t.context.tmpDir)
  const sls = buildSls()
  sls.service.custom.describe = '${git:message}' // eslint-disable-line
  await t.throws(sls.variables.populateService(), /could not find repository*/)
})

test.serial('Inserts variables', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)
  const currentDir = path.basename(t.context.tmpDir)

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.commit = '${git:commit}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.describe2 = '${git:describe}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  sls.service.custom.describeLight = '${git:describeLight}' // eslint-disable-line
  sls.service.custom.repository = '${git:repository}' // eslint-disable-line
  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, '90440bd')
  t.is(sls.service.custom.commit, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(sls.service.custom.branch, 'another_branch')
  t.is(sls.service.custom.describe, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.describe2, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.message, 'Another commit')
  t.is(sls.service.custom.describeLight, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.repository, currentDir)
})

test('Returns cached value as promise', async t => {
  let serverless = new Serverless()
  let vars = new ServerlessGitVariables(serverless, {})
  let fakeTag = 'my_tag-2-c1023gh'
  vars.resolvedValues['describe'] = fakeTag
  await serverless.variables.getValueFromSource('git:describe').then(value => {
    t.is(value, fakeTag)
  })
})

test.serial('isDirty variable works as expected', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  let func = {
    name: 'myFunction',
    environment: {}
  }
  let plugin = new ServerlessGitVariables(generateFakeServerless(func), {})
  await plugin.exportGitVariables()
  t.is(func.tags.GIT_IS_DIRTY, 'false')

  const filename = `${t.context.tmpDir}/_my_new_file.txt`
  touchFile(filename)

  func = {
    name: 'myFunction',
    environment: {}
  }
  plugin = new ServerlessGitVariables(generateFakeServerless(func), {})
  await plugin.exportGitVariables()
  t.is(func.tags.GIT_IS_DIRTY, 'true')
})

test.serial('Env variables defined', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }
  const plugin = new ServerlessGitVariables(generateFakeServerless(func), {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_COMMIT_SHORT, '90440bd')
  t.is(func.environment.GIT_COMMIT_LONG, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(func.environment.GIT_BRANCH, 'another_branch')
  t.is(func.environment.GIT_IS_DIRTY, 'false')

  t.is(func.tags.GIT_COMMIT_SHORT, '90440bd')
  t.is(func.tags.GIT_COMMIT_LONG, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(func.tags.GIT_BRANCH, 'another_branch')
  t.is(func.tags.GIT_IS_DIRTY, 'false')
})

test.serial('Disabling export of env variables', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }
  const fakeServerless = generateFakeServerless(func, { exportGitVariables: false })
  const plugin = new ServerlessGitVariables(fakeServerless, {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_COMMIT_SHORT, undefined)
  t.is(func.environment.GIT_COMMIT_LONG, undefined)
  t.is(func.environment.GIT_BRANCH, undefined)
  t.is(func.environment.GIT_IS_DIRTY, undefined)

  t.is(func.tags, undefined)
})

/**
 * Make a fake 'serverless' object for use during testing.
 */
function generateFakeServerless(func, custom) {
  const fakeServerless = {
    service: {
      getAllFunctions: () => [func.name],
      getFunction: name => func
    },
    variables: {
      getValueFromSource: () => 'fake'
    }
  }
  if (custom) {
    fakeServerless.service.custom = custom
  }

  return fakeServerless
}

/**
 * Reset file modified time like *nix 'touch'.
 * Creates file if does not exist.
 *
 * Source:
 *   https://remarkablemark.org/blog/2017/12/17/touch-file-nodejs/
 *
 * @param {String} filename
 */
function touchFile(filename) {
  if (!filename) {
    throw new Error('[touchFile] missing required param \'filename\'')
  }

  const time = new Date()
  try {
    fs.utimeSync(filename, time, time)
  } catch (ex) {
    fs.closeSync(fs.openSync(filename, 'w'))
  }
}
