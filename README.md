# serverless-plugin-git-variables
[![Coverage Status](https://coveralls.io/repos/github/jacob-meacham/serverless-plugin-git-variables/badge.svg?branch=develop)](https://coveralls.io/github/jacob-meacham/serverless-plugin-git-variables?branch=develop)
[![Build Status](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables.svg?branch=develop)](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables)

Expose git variables (HEAD description, branch name, short commit hash, message, git tags, and if the local repo has changed files) to your serverless services.
Moreover, it adds GIT related environment variables and tags (GIT_COMMIT_SHORT, GIT_COMMIT_LONG, GIT_BRANCH, GIT_IS_DIRTY, GIT_REPOSITORY, GIT_TAGS) for each defined function in the serverless file. You can disable this by adding the following custom variable in your serverless.yml file:

```
custom:
  exportGitVariables: false
```

If you only want to add a specific subset of variables/tags, you can define a whitelist:

```
custom:
  gitVariablesEnvWhitelist: ['GIT_COMMIT_SHORT', 'GIT_TAGS']
  gitVariablesTagsWhitelist: ['GIT_REPOSITORY', 'GIT_COMMIT_LONG']
```

If you have multiple git tags, you'll run into issues when adding them as AWS tags, so you'll need to exclude them from the whitelist.

# Usage
```yaml

custom:
  gitDescription: ${git:repository} - ${git:branch} - ${git:tags}

functions:
  processEventBatch:
    name: ${self:provider.stage}-${self:service}-process-event-batch
    description: ${self:custom.gitDescription}

  processEventBatch2:
    name: ${self:provider.stage}-${self:service}-process-event-batch-2
    description: ${self:custom.gitDescription}

plugins:
  - serverless-plugin-git-variables

resources:
  Description: >
    ${self:service} ${git:branch}:${git:sha1}
    https://github.com/jacob-meacham/serverless-plugin-git-variables
    ${git:message}
```

## Available variables

* git:repository - name of the git repository
* git:sha1 - hash of the current commit
* git:branch - name of the current branch
* git:isDirty - true if the workspace is currently dirty
* git:describe / git:describeLight - see below

## describe and describeLight
The describe (`${git:describe}`) and the describeLight (`${git:describeLight}`) variables are both used to return the most recent tag of the repo. However the difference is that whilst `describe` evaluates to `git describe --always`, the `describeLight` variable evaluates to `git describe --always --tags`.
`--always` will ensure that if no tags are present, the commit hash is shown as a fallback option. (See [git describe documentation](https://git-scm.com/docs/git-describe) for more information).

Annotated tags are shown by both `describe` and `describeLight`, only `describeLight` will show lightweight tags (such as those generated when using GitHub's releases feature).

For more information on annotated and lightweight tags go to the [git documentation on tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging).

## tags

The tags (`${git:tags}`) is used to get info about which git tags (separated by ::) are pointing to current commit and if none it will show commit ID as fallback.

# Version History
* 5.0.1
  - Fix module export (Thanks @nason)
* 5.0.0
  - Rely on a more modern version of Node, which allows removal of runtime dependencies
* 4.1.0
  - Fix sporadic failure with git write-tree (Thanks to @navrkald and @james-hu)
* 4.0.0
  - Change `tags` separator from ',' to '::' to conform to the AWS tag regex
* 3.5.0
  - Add ability to specify whitelist of variables to set on the environment or in tags
* 3.4.0
  - Add user name / email (Thanks to @JordanReiter)
  - Add git tag information (Thanks to @navrkald)
* 3.3.3
  - Update dependencies thanks to dependabot
* 3.3.2
  - Fixed issue with sporadic command failures (Thanks to @iamakulov)
* 3.3.1
  - Changed approach for finding repository name, to fix plugin on Windows
* 3.3.0
  - Added repository name (Thanks to @iDVB)
* 3.2.0
  - Added a describeLight git variable, which allows use of lightweight tags (Thanks to @domroutley)
* 3.1.1
  - Fix issue that occurs if a function has no environment specified (Thanks to @arnaudh-nutonomy)
* 3.1.0
  - Plugin now also adds environment variables that are accessible at runtime (Thanks to @chechu)
* 3.0.0
  - Add support for long commit hash (Thanks to @e-e-e)
  - backwards incompatible change: git describe now uses --always, so if there are not tags it returns a hash instead of failing (Thanks to @e-e-e)
* 2.1.1
  - Fix packaging issue
* 2.1.0
  - Add support for git message (Thanks to @campadrenalin)
* 2.0.0
  - support Serverless >= 1.16.0
* 1.0.1
  - list babel-runtime as a dependency
* 1.0.0
  - Initial release
