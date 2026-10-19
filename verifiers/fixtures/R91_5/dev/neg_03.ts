import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class LegacyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, fnArn: string) {
    super(scope, id);
    const api = new apigw.RestApi(this, 'LegacyApi');
    api.root.addResource('invoices').addMethod('GET', new apigw.AwsIntegration({
      service: 'lambda',
      path: `2015-03-31/functions/${fnArn}/invocations`,
      integrationHttpMethod: 'POST',
    }));
  }
}
