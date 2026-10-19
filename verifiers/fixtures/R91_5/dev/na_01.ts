import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class StorageStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const table = new dynamodb.Table(this, 'Events', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const worker = new lambda.Function(this, 'Worker', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'worker.handler',
      code: lambda.Code.fromAsset('lambda/worker'),
    });
    table.grantReadWriteData(worker);
  }
}
