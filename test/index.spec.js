import test from 'ava'
import process from 'process'
import tmp from 'tmp'
import fs from 'fs-extra'
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
  fs.copySync('test/resources/simple_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  await t.throws(sls.variables.populateService(), /Error: Command failed: git describe/)
})

test.serial('Inserts variables', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.describe2 = '${git:describe}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, '90440bd')
  t.is(sls.service.custom.branch, 'another_branch')
  t.is(sls.service.custom.describe, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.describe2, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.message, 'Another commit')
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
