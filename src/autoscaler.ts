import * as path from 'path';
import {
  Stack, Duration, CfnResource, CfnOutput, Token,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_sns as sns,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as sfn_tasks,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

const AWSCLI_LAYER_ARN = 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli';
const AWSCLI_LAYER_VERSION = '1.16.281';

export interface FargateFastAutoscalerProps {
  /**
   * The VPC for the stack
   */
  readonly vpc: ec2.IVpc;

  /**
   * SNS Topic to publish the notification
   *
   * @default - do not publish to SNS
   */
  readonly snsTopic?: sns.ITopic;

  /**
   * AWS CLI Lambda layer ARN in Serverless App Repository
   *
   * @default - 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
   */
  readonly awsCliLayerArn?: string;

  /**
   * The version of the Serverless App for AWS CLI Lambda layer
   *
   * @default - AWSCLI_LAYER_VERSION
   */
  readonly awsCliLayerVersion?: string;

  /**
   * backend container
   */
  readonly backendContainer: ecs.ContainerDefinitionOptions;

  /**
   * initial number of tasks for the service
   *
   * @default - 2
   */
  readonly initialTaskNumber?: number;

  /**
   * disable scale in
   *
   * @default - true
   */
  readonly disableScaleIn?: boolean;
}


export class FargateFastAutoscaler extends Construct {
  public readonly fargateWatcherFuncArn: string;
  public readonly layerVersionArn: string;
  public readonly fargateService: ecs.FargateService;
  public readonly fargateTaskDef: ecs.FargateTaskDefinition;
  public readonly vpc: ec2.IVpc;
  public readonly region: string;

  constructor(scope: Construct, id: string, props: FargateFastAutoscalerProps) {
    super(scope, id);

    this.vpc = props.vpc;
    this.region = Stack.of(this).region;

    // create a security group that allows all traffic from the same sg
    const sg = new ec2.SecurityGroup(this, 'SharedSecurityGroup', {
      vpc: this.vpc,
    });
    sg.connections.allowFrom(sg, ec2.Port.allTraffic());
    sg.connections.allowFrom(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.allTraffic());



    // // Fargate Cluster
    const fgCluster = new ecs.Cluster(this, 'fgCluster', {
      vpc: this.vpc,
    });


    // // task iam role
    const taskIAMRole = new iam.Role(this, 'fgDemoTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskIAMRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['xray:PutTraceSegments'],
    }));

    // ECS task definition
    const demoTaskDef = new ecs.FargateTaskDefinition(this, 'cdk-fargate-demo-taskdef', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole: taskIAMRole,
    });

    this.fargateTaskDef = demoTaskDef;

    const mainContainer = demoTaskDef.addContainer('main', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../nginx')),
      cpu: 0,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'echo-http-req',
      }),
    });

    // const phpContainer = demoTaskDef.addContainer('backend', {
    //   image: ecs.ContainerImage.fromAsset('./php', {}),
    //   cpu: 0,
    //   logging: new ecs.AwsLogDriver({
    //     streamPrefix: 'echo-http-req'
    //   })
    // })

    // mainContainer.addLink(phpContainer, 'app')

    mainContainer.addPortMappings({
      containerPort: 80,
    });

    // phpContainer.addPortMappings({
    //   containerPort: 2015
    // })

    const demoService = new ecs.FargateService(this, 'demo-service', {
      cluster: fgCluster,
      desiredCount: props.initialTaskNumber ?? 2,
      taskDefinition: demoTaskDef,
      securityGroups: [sg],
    });

    this.fargateService = demoService;


    const externalLB = new elbv2.NetworkLoadBalancer(this, 'external', {
      vpc: this.vpc,
      internetFacing: true,
    });

    const externalListener = externalLB.addListener('PublicListener', {
      port: 80,
    });

    externalListener.addTargets('fg-echo-req', {
      port: 80,
      protocol: elbv2.Protocol.TCP,
      targets: [demoService],
      deregistrationDelay: Duration.seconds(3),
    });


    const lambdaRole = new iam.Role(this, 'lambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'));
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'));

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
      ],
    }));


    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
    }));

    // const uniqueId = crypto.createHash('md5').update(this.node.path).digest("hex");
    Stack.of(this).templateOptions.transforms = ['AWS::Serverless-2016-10-31']; // required for AWS::Serverless
    const resource = new CfnResource(this, 'Resource', {
      type: 'AWS::Serverless::Application',
      properties: {
        Location: {
          ApplicationId: props.awsCliLayerArn ?? AWSCLI_LAYER_ARN,
          SemanticVersion: props.awsCliLayerVersion ?? AWSCLI_LAYER_VERSION,
        },
        Parameters: {},
      },
    });
    this.layerVersionArn = Token.asString(resource.getAtt('Outputs.LayerVersionArn'));

    const fargateWatcherFunc = new lambda.Function(this, 'fargateWatcherFunc', {
      runtime: lambda.Runtime.PROVIDED,
      handler: 'main',
      code: lambda.Code.fromAsset(path.join(__dirname, '../sam/fargateWatcherFunc/func.d')),
      layers: [lambda.LayerVersion.fromLayerVersionArn(this, 'AwsCliLayer', this.layerVersionArn)],
      memorySize: 1024,
      timeout: Duration.minutes(1),
      role: lambdaRole,
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      securityGroups: [sg],
      environment: {
        cluster: fgCluster.clusterName,
        service: demoService.serviceName,
        disable_scalein: props.disableScaleIn === false ? 'no' : 'yes',
        region: this.region,
      },
    });

    this.fargateWatcherFuncArn = fargateWatcherFunc.functionArn;

    // step function
    const wait3 = new sfn.Wait(this, 'Wait 3 Seconds', {
      // time: sfn.WaitTime.secondsPath('$.wait_time')
      time: sfn.WaitTime.duration(Duration.seconds(3)),
    });
    const wait60 = new sfn.Wait(this, 'Wait 60 Seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(60)),
    });

    // const getEcsTasks = new sfn.Task(this, 'GetECSTasks', {
    //   task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'getEcsTasks', fargateWatcherFunc.functionArn)),
    //   resultPath: '$.status',
    // });

    const getEcsTasks = new sfn_tasks.LambdaInvoke(this, 'GetECSTasks', {
      lambdaFunction: lambda.Function.fromFunctionArn(this, 'getEcsTasks', fargateWatcherFunc.functionArn),
      resultPath: '$.status',
    });
    const topic = props.snsTopic ?? new sns.Topic(this, `${id}-topic`, {
      topicName: `${Stack.of(this).stackName}-${id}`,
    });

    const snsScaleOut = new sfn_tasks.SnsPublish(this, 'SNSScaleOut', {
      message: sfn.TaskInput.fromObject({
        'Input.$': '$',
      }),
      topic,
      subject: 'Fargate Start Scaling Out',
      resultPath: '$.taskresult',
    });

    const svcScaleOut = new sfn_tasks.LambdaInvoke(this, 'ServiceScaleOut', {
      lambdaFunction: lambda.Function.fromFunctionArn(this, 'svcScaleOut', fargateWatcherFunc.functionArn),
    });

    const isServiceOverloaded = new sfn.Choice(this, 'IsServiceOverloaded', {
      inputPath: '$.status',
    });
    const isDone = new sfn.Pass(this, 'Done');

    const desire2 = new sfn.Pass(this, 'Desire2', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 2 }),
    });
    // const desire5 = new sfn.Pass(this, 'Desire5', {
    //     outputPath: DISCARD,
    //     result: sfn.Result.fromObject({Desired: 5})
    // })
    const desire10 = new sfn.Pass(this, 'Desire10', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 10 }),
    });
    const desire15 = new sfn.Pass(this, 'Desire15', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 15 }),
    });
    const desire20 = new sfn.Pass(this, 'Desire20', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 20 }),
    });

    const chain = sfn.Chain
      .start(getEcsTasks)
      .next(isServiceOverloaded
        .when(sfn.Condition.numberGreaterThanEquals('$.Payload.avg', 500), desire20
          .next(snsScaleOut
            .next(svcScaleOut
              .next(wait60
                .next(getEcsTasks,
                )))))
        .when(sfn.Condition.numberGreaterThanEquals('$.Payload.avg', 300), desire15
          .next(snsScaleOut,
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.Payload.avg', 100), desire10
          .next(snsScaleOut,
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.Payload.avg', 50), desire2
          .next(snsScaleOut,
          ))
        // .when(sfn.Condition.numberLessThanEquals('$.Payload.avg', 10), desire2
        //     .next(snsScaleOut
        // ))
        .when(sfn.Condition.numberLessThan('$.Payload.avg', 0), isDone)
        .otherwise(wait3
          .next(getEcsTasks),
        ));

    new sfn.StateMachine(this, 'FargateFastAutoscaler', {
      definition: chain,
      timeout: Duration.hours(24),
    });

    new CfnOutput(this, 'ClusterARN: ', { value: fgCluster.clusterArn });
    new CfnOutput(this, 'URL: ', { value: 'http://' + externalListener.loadBalancer.loadBalancerDnsName });
    new CfnOutput(this, 'FargateWatcherLambdaArn: ', { value: fargateWatcherFunc.functionArn });
  }
}
