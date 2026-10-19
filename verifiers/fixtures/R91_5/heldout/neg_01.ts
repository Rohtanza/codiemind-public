import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration, HttpUrlIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export class GatewayStack extends Stack {
  constructor(scope: Construct, id: string, fn: IFunction) {
    super(scope, id);
    const api = new HttpApi(this, 'Gateway');
    api.addRoutes({ path: '/me', methods: [HttpMethod.GET], integration: new HttpLambdaIntegration('Me', fn) });
    api.addRoutes({
      path: '/docs',
      methods: [HttpMethod.GET],
      integration: new HttpUrlIntegration('Docs', 'https://docs.example.com'),
    });
  }
}
