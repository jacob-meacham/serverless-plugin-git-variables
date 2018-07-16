# serverless-plugin-git-variables
[![Coverage Status](https://coveralls.io/repos/github/jacob-meacham/serverless-plugin-git-variables/badge.svg?branch=develop)](https://coveralls.io/github/jacob-meacham/serverless-plugin-git-variables?branch=develop)
[![Build Status](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables.svg?branch=develop)](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables)

Expose git variables (HEAD description, branch name, short commit hash, and message) to your serverless services.

# Usage
```yaml

functions:
  processEventBatch:
    name: ${self:provider.stage}-${self:service}-process-event-batch
    description: ${git:branch} - ${git:describe} - ${git:sha1}

plugins:
  - serverless-plugin-git-variables
```

# Serverless Version Support
* If you're using serverless 1.12.x or below, use the 1.x.x version of this plugin.
* This plugin is currently broken for serverless versions between 1.13 and 1.15 (inclusive).
* If you're using serverless 1.16.x or above, use the >=2.x.x version of this plugin.

# Version History
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
