import { Stack, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

export class SearchStack extends Stack {
  constructor(scope: Construct, id: string, searchFn: IFunction) {
    super(scope, id);
    const api = new LambdaRestApi(this, 'SearchApi', { handler: searchFn });
    new CfnOutput(this, 'SearchApiNote', {
      value: 'Replaces the old HttpIntegration endpoint (type: "HTTP") with ' + api.url,
    });
  }
}
