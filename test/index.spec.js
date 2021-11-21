import test from 'ava'
import process from 'process'
import tmp from 'tmp'
import fs from 'fs-extra'
import Serverless from 'serverless'
import util from 'util'
import childProcess from 'child_process'

import ServerlessGitVariables from '../src'

const exec = util.promisify(childProcess.exec)

function buildSls() {
  const sls = new Serverless({
    commands: [],
    options: {}
  })

  sls.pluginManager.addPlugin(ServerlessGitVariables)

  return sls
}

test.beforeEach(t => {
  t.context.initalDir = process.cwd()
})

test.beforeEach(t => {
  t.context.tmpDir = tmp.dirSync({ unsafeCleanup: true }).name
})

test.afterEach.always(t => {
  process.chdir(t.context.initalDir)
})

test.serial('Rejects on bad git command', async t => {
  process.chdir(t.context.tmpDir)
  const sls = buildSls()
  sls.service.custom.describe = '${git:message}' // eslint-disable-line
  await t.throwsAsync(() => {
    return sls.variables.populateService()
  }, { message: /N|not a git repository*/ })
})

test.serial('Inserts variables', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.commit = '${git:commit}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.describe2 = '${git:describe}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  sls.service.custom.describeLight = '${git:describeLight}' // eslint-disable-line
  sls.service.custom.repository = '${git:repository}' // eslint-disable-line
  sls.service.custom.gitUser = '${git:user}' // eslint-disable-line
  sls.service.custom.gitEmail = '${git:email}' // eslint-disable-line
  sls.service.custom.tags = '${git:tags}' // eslint-disable-line

  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, '90440bd')
  t.is(sls.service.custom.commit, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(sls.service.custom.branch, 'another_branch')
  t.is(sls.service.custom.describe, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.describe2, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.message, 'Another commit')
  t.is(sls.service.custom.describeLight, 'my_tag-1-g90440bd')
  t.is(sls.service.custom.gitUser, 'Full User')
  t.is(sls.service.custom.gitEmail, 'full@example.com')
  t.is(sls.service.custom.tags, '90440bd')
})

test.serial('One tag on HEAD', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  await exec('git checkout master')

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.commit = '${git:commit}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.describe2 = '${git:describe}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  sls.service.custom.describeLight = '${git:describeLight}' // eslint-disable-line
  sls.service.custom.repository = '${git:repository}' // eslint-disable-line
  sls.service.custom.tags = '${git:tags}' // eslint-disable-line
  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, 'ef5f068')
  t.is(sls.service.custom.commit, 'ef5f0683654427ff38d43836098f6336d73c4576')
  t.is(sls.service.custom.branch, 'master')
  t.is(sls.service.custom.describe, 'my_tag')
  t.is(sls.service.custom.describe2, 'my_tag')
  t.is(sls.service.custom.message, 'Initial')
  t.is(sls.service.custom.describeLight, 'my_tag')
  t.is(sls.service.custom.tags, 'my_tag')
})

test.serial('Multiple tags on HEAD', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  await childProcess.exec('git checkout branch_with_tags')

  const sls = buildSls()
  sls.service.custom.describe = '${git:describe}' // eslint-disable-line
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.commit = '${git:commit}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.describe2 = '${git:describe}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  sls.service.custom.describeLight = '${git:describeLight}' // eslint-disable-line
  sls.service.custom.repository = '${git:repository}' // eslint-disable-line
  sls.service.custom.tags = '${git:tags}' // eslint-disable-line
  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, '1335258')
  t.is(sls.service.custom.commit, '1335258f70f45c6243bc674df830cd0ec7c3c714')
  t.is(sls.service.custom.branch, 'branch_with_tags')
  t.is(sls.service.custom.describe, 'my_tag-1-g1335258')
  t.is(sls.service.custom.describe2, 'my_tag-1-g1335258')
  t.is(sls.service.custom.message, 'Commit with tags.')
  t.is(sls.service.custom.describeLight, 'tag1')
  t.is(sls.service.custom.tags, 'tag1::tag2')
})

test.serial('Multiline message on HEAD', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  await childProcess.exec('git checkout branch_with_multiline_msg')

  const sls = buildSls()
  sls.service.custom.sha1 = '${git:sha1}' // eslint-disable-line
  sls.service.custom.commit = '${git:commit}' // eslint-disable-line
  sls.service.custom.branch = '${git:branch}' // eslint-disable-line
  sls.service.custom.message = '${git:message}' // eslint-disable-line
  sls.service.custom.messageSubject = '${git:messageSubject}' // eslint-disable-line
  sls.service.custom.messageBody = '${git:messageBody}' // eslint-disable-line
  await sls.variables.populateService()

  t.is(sls.service.custom.sha1, '4b4971e')
  t.is(sls.service.custom.commit, '4b4971e54a1cd05eab6c0ae32cf5cd330c9dcc41')
  t.is(sls.service.custom.branch, 'branch_with_multiline_msg')
  t.is(sls.service.custom.message, 'Commit with subject and body\n\nThis is the first line of the body.\n\nAnd this is another line.')
  t.is(sls.service.custom.messageSubject, 'Commit with subject and body')
  t.is(sls.service.custom.messageBody, 'This is the first line of the body.\n\nAnd this is another line.')
})

test('Returns cached value as promise', async t => {
  const serverless = new Serverless({
    commands: [],
    options: {}
  })
  const vars = new ServerlessGitVariables(serverless, {})
  const fakeTag = 'my_tag-2-c1023gh'
  vars.resolvedValues.describe = fakeTag
  await serverless.variables.getValueFromSource('git:describe').then(value => {
    t.is(value, fakeTag)
  })
})

test.serial('Env variables defined', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }

  const fakeServerless = {
    service: {
      getAllFunctions: () => [func.name],
      getFunction: name => func
    },
    variables: {
      getValueFromSource: () => 'fake'
    }
  }

  const plugin = new ServerlessGitVariables(fakeServerless, {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_COMMIT_SHORT, '90440bd')
  t.is(func.environment.GIT_COMMIT_LONG, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(func.environment.GIT_BRANCH, 'another_branch')
  t.is(func.environment.GIT_IS_DIRTY, 'false')
  t.is(func.environment.GIT_TAGS, '90440bd')

  t.is(func.tags.GIT_COMMIT_SHORT, '90440bd')
  t.is(func.tags.GIT_COMMIT_LONG, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(func.tags.GIT_BRANCH, 'another_branch')
  t.is(func.tags.GIT_IS_DIRTY, 'false')
  t.is(func.tags.GIT_TAGS, '90440bd')
})

test.serial('Whitelist', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }

  const fakeServerless = {
    service: {
      getAllFunctions: () => [func.name],
      getFunction: name => func,
      custom: {
        gitVariablesEnvWhitelist: ['GIT_COMMIT_SHORT', 'GIT_IS_DIRTY'],
        gitVariablesTagsWhitelist: ['GIT_COMMIT_LONG', 'GIT_TAGS']
      }
    },
    variables: {
      getValueFromSource: () => 'fake'
    }
  }

  const plugin = new ServerlessGitVariables(fakeServerless, {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_COMMIT_SHORT, '90440bd')
  t.is(func.environment.GIT_COMMIT_LONG, undefined)
  t.is(func.environment.GIT_BRANCH, undefined)
  t.is(func.environment.GIT_IS_DIRTY, 'false')
  t.is(func.environment.GIT_TAGS, undefined)

  t.is(func.tags.GIT_COMMIT_SHORT, undefined)
  t.is(func.tags.GIT_COMMIT_LONG, '90440bdc8eb3b2fa20bc578f411cf4b725ae0a25')
  t.is(func.tags.GIT_BRANCH, undefined)
  t.is(func.tags.GIT_IS_DIRTY, undefined)
  t.is(func.tags.GIT_TAGS, '90440bd')
})

test.serial('User/Email not exported', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }

  const fakeServerless = {
    service: {
      getAllFunctions: () => [func.name],
      getFunction: name => func
    },
    variables: {
      getValueFromSource: () => 'fake'
    }
  }

  const plugin = new ServerlessGitVariables(fakeServerless, {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_USER, undefined)
  t.is(func.environment.GIT_EMAIL, undefined)

  t.is(func.tags.GIT_USER, undefined)
  t.is(func.tags.GIT_EMAIL, undefined)
})

test.serial('Disabling export of env variables', async t => {
  fs.copySync('test/resources/full_repo/git', `${t.context.tmpDir}/.git`)
  process.chdir(t.context.tmpDir)

  const func = {
    name: 'myFunction',
    environment: {}
  }

  const fakeServerless = {
    service: {
      getAllFunctions: () => [func.name],
      getFunction: name => func,
      custom: { exportGitVariables: false }
    },
    variables: {
      getValueFromSource: () => 'fake'
    }
  }
  const plugin = new ServerlessGitVariables(fakeServerless, {})
  await plugin.exportGitVariables()

  t.is(func.environment.GIT_COMMIT_SHORT, undefined)
  t.is(func.environment.GIT_COMMIT_LONG, undefined)
  t.is(func.environment.GIT_BRANCH, undefined)
  t.is(func.environment.GIT_IS_DIRTY, undefined)
  t.is(func.environment.GIT_TAGS, undefined)

  t.is(func.tags, undefined)
})
