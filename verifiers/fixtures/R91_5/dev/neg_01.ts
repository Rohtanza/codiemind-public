import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class ReportsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);
    const reportsFn = new lambda.Function(this, 'ReportsFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/reports'),
    });
    const api = new apigateway.RestApi(this, 'ReportsApi');
    const reports = api.root.addResource('reports');
    reports.addMethod('GET', new apigateway.LambdaIntegration(reportsFn));
    reports.addMethod('POST', new apigateway.LambdaIntegration(reportsFn, {
      proxy: false,
      integrationResponses: [{ statusCode: '200' }],
    }), { methodResponses: [{ statusCode: '200' }] });
  }
}
