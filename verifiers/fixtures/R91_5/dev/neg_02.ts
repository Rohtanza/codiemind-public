import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi, MockIntegration, PassthroughBehavior } from 'aws-cdk-lib/aws-apigateway';

export class HealthStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const api = new RestApi(this, 'HealthApi');
    api.root.addResource('health').addMethod('GET', new MockIntegration({
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
      integrationResponses: [{ statusCode: '200' }],
    }), { methodResponses: [{ statusCode: '200' }] });
  }
}
