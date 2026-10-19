import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class PaymentsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, fn: lambda.IFunction) {
    super(scope, id);
    const api = new apigateway.RestApi(this, 'PaymentsApi');
    // Previously this used `proxy: false` with a MockIntegration for /status;
    // both endpoints now go straight to the Lambda handler.
    const payments = api.root.addResource('payments');
    payments.addMethod('POST', new apigateway.LambdaIntegration(fn));
    payments.addResource('status').addMethod('GET', new apigateway.LambdaIntegration(fn));
  }
}
