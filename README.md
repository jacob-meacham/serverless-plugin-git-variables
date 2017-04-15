# serverless-plugin-git-variables
[![Coverage Status](https://coveralls.io/repos/github/jacob-meacham/serverless-plugin-git-variables/badge.svg?branch=develop)](https://coveralls.io/github/jacob-meacham/serverless-plugin-git-variables?branch=develop)
[![Build Status](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables.svg?branch=develop)](https://travis-ci.org/jacob-meacham/serverless-plugin-git-variables)

Expose git variables (long and short commit hash, head description) to your serverless services.

## TODO
* These should be bound using the regular variable syntax - that way we don't have to take 2 variable passes.

# Usage
```yaml

custom:
  myVariable: bar

resources:
  Resources:
    PathMapping:
      Type: AWS::ApiGateway::BasePathMapping
      DependsOn: ApiGatewayStage
      Properties:
        BasePath: analytics
        DomainName: ${self:provider.domain}
        RestApiId:
          Ref: __deployment__
        Stage: ${self:provider.stage}
    __deployment__:
      Properties:
        DataTraceEnabled: true
        MetricsEnabled: true
    ApiGatewayStage:
      Type: AWS::ApiGateway::Stage
      Properties:
        DeploymentId:
          Ref: __deployment__
        Variables: [${self:custom.myVariable}]
        MethodSettings:
          - DataTraceEnabled: false
            HttpMethod: "GET"
            LoggingLevel: INFO
            ResourcePath: "/foo"
            MetricsEnabled: false
plugins:
  - serverless-plugin-bind-deployment-id
```

When built, this will merge the custom properties set above with the default CloudFormation template, allowing you to apply custom properties to your Deployment or Stage. This will even allow you to add multiple Stages!

## Advanced Usage
By default `__deployment__` is the sentinel value which is replaced by the API Deployment Id. This is configurable. If you'd like to use a different value, you can set:

```yaml
custom:
  deploymentId:
    variableSyntax: ApiGatewayDeployment
```

In this example, any instance of ApiGatewayDeployment in your custom resources will be replaced with the true deployment Id.
