import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class UsersApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    const handler = new lambda.Function(this, 'UsersFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/users'),
    });
    const api = new apigateway.RestApi(this, 'UsersApi');
    const users = api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(handler));
    users.addMethod('POST', new apigateway.LambdaIntegration(handler, { proxy: true }));
  }
}
