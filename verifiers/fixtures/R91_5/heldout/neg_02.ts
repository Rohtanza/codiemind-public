import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class CfnLegacyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, restApiId: string, resourceId: string, uri: string) {
    super(scope, id);
    new apigw.CfnMethod(this, 'PostOrder', {
      restApiId,
      resourceId,
      httpMethod: 'POST',
      authorizationType: 'NONE',
      integration: {
        type: 'AWS',
        integrationHttpMethod: 'POST',
        uri,
        requestTemplates: { 'application/json': '$input.json("$")' },
      },
    });
  }
}
