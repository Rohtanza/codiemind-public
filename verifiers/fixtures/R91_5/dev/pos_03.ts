import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class ProductsStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const fn = lambda.Function.fromFunctionName(this, 'ProductsFn', 'products-handler');
    const httpApi = new HttpApi(this, 'ProductsHttpApi');
    httpApi.addRoutes({
      path: '/products/{id}',
      methods: [HttpMethod.GET, HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('ProductsIntegration', fn),
    });
  }
}
