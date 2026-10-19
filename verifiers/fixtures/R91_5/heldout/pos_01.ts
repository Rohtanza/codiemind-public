import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class CfnApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, api: apigw.CfnRestApi, resourceId: string, fnArn: string) {
    super(scope, id);
    new apigw.CfnMethod(this, 'GetItems', {
      restApiId: api.ref,
      resourceId,
      httpMethod: 'GET',
      authorizationType: 'NONE',
      integration: {
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${fnArn}/invocations`,
      },
    });
  }
}
