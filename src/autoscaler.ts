import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as iam from '@aws-cdk/aws-iam';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfn_tasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sns from '@aws-cdk/aws-sns';
import * as path from 'path';

const AWSCLI_LAYER_ARN = 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
const AWSCLI_LAYER_VERSION = '1.16.281'

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
   * container port for the backend container
   */
  readonly backendContainerPortMapping: ecs.PortMapping[]

  /**
   * initial number of tasks for the service
   * 
   * @default - 2
   */
  readonly initialTaskNumber?: number

  /**
   * disable scale in
   * 
   * @default - true
   */
  readonly disableScaleIn?: boolean
}


export class FargateFastAutoscaler extends cdk.Construct {
  public readonly fargateWatcherFuncArn: string;
  public readonly layerVersionArn: string;
  public readonly fargateService: ecs.FargateService;
  public readonly fargateTaskDef: ecs.FargateTaskDefinition;
  public readonly vpc: ec2.IVpc;
  public readonly region: string;

  constructor(scope: cdk.Construct, id: string, props: FargateFastAutoscalerProps) {
    super(scope, id);

    this.vpc = props.vpc;
    this.region = cdk.Stack.of(this).region;

    // create a security group that allows all traffic from the same sg
    const sg = new ec2.SecurityGroup(this, 'SharedSecurityGroup', {
      vpc: this.vpc,
    })
    sg.connections.allowFrom(sg, ec2.Port.allTraffic())


    //sg for HTTP public access
    const httpPublicSecurityGroup = new ec2.SecurityGroup(this, 'HttpPublicSecurityGroup', {
      allowAllOutbound: true,
      securityGroupName: 'HttpPublicSecurityGroup',
      vpc: this.vpc,
    });

    httpPublicSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80));


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
    })

    this.fargateTaskDef = demoTaskDef

    const mainContainer = demoTaskDef.addContainer('main', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, './nginx')),
      cpu: 0,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'echo-http-req',
      }),
    })

    const backendContainer = demoTaskDef.addContainer('backend', props.backendContainer)

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
    })

    backendContainer.addPortMappings(...props.backendContainerPortMapping)

    // phpContainer.addPortMappings({
    //   containerPort: 2015
    // })

    const demoService = new ecs.FargateService(this, 'demo-service', {
      cluster: fgCluster,
      desiredCount: props.initialTaskNumber ?? 2,
      taskDefinition: demoTaskDef,
      securityGroup: sg,
    });

    this.fargateService = demoService


    const externalLB = new elbv2.ApplicationLoadBalancer(this, 'external', {
      vpc: this.vpc,
      internetFacing: true,
      securityGroup: httpPublicSecurityGroup,
    });

    const externalListener = externalLB.addListener('PublicListener', {
      port: 80,
    });


    const healthCheckDefault = {
      port: 'traffic-port',
      path: '/',
      intervalSecs: 30,
      timeoutSeconds: 5,
      healthyThresholdCount: 5,
      unhealthyThresholdCount: 2,
      healthyHttpCodes: '200,301,302',
    };

    externalListener.addTargets('fg-echo-req', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: healthCheckDefault,
      targets: [demoService],
      deregistrationDelay: cdk.Duration.seconds(3),
    });


    const lambdaRole = new iam.Role(this, 'lambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'))
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'))

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
    cdk.Stack.of(this).templateOptions.transforms = ['AWS::Serverless-2016-10-31']; // required for AWS::Serverless
    const resource = new cdk.CfnResource(this, 'Resource', {
      type: 'AWS::Serverless::Application',
      properties: {
        Location: {
          ApplicationId: props.awsCliLayerArn ?? AWSCLI_LAYER_ARN,
          SemanticVersion: props.awsCliLayerVersion ?? AWSCLI_LAYER_VERSION,
        },
        Parameters: {},
      },
    })
    this.layerVersionArn = cdk.Token.asString(resource.getAtt('Outputs.LayerVersionArn'));

    const fargateWatcherFunc = new lambda.Function(this, 'fargateWatcherFunc', {
      runtime: lambda.Runtime.PROVIDED,
      handler: 'main',
      code: lambda.Code.fromAsset(path.join(__dirname, './sam/fargateWatcherFunc/func.d')),
      layers: [lambda.LayerVersion.fromLayerVersionArn(this, 'AwsCliLayer', this.layerVersionArn)],
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      role: lambdaRole,
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
      securityGroup: sg,
      environment: {
        cluster: fgCluster.clusterName,
        service: demoService.serviceName,
        disable_scalein: props.disableScaleIn === false ? 'no' : 'yes',
        region: this.region,
      },
    });

    this.fargateWatcherFuncArn = fargateWatcherFunc.functionArn

    // step function
    const wait3 = new sfn.Wait(this, 'Wait 3 Seconds', {
      // time: sfn.WaitTime.secondsPath('$.wait_time') 
      time: sfn.WaitTime.duration(cdk.Duration.seconds(3)),
    });
    const wait60 = new sfn.Wait(this, 'Wait 60 Seconds', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
    });

    const getEcsTasks = new sfn.Task(this, 'GetECSTasks', {
      task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'getEcsTasks', fargateWatcherFunc.functionArn)),
      resultPath: '$.status',
    });

    const topic = props.snsTopic ?? new sns.Topic(this, `${id}-topic`, {
      topicName: `${cdk.Stack.of(this).stackName}-${id}`,
    })

    const snsScaleOut = new sfn.Task(this, 'SNSScaleOut', {
      task: new sfn_tasks.PublishToTopic(topic, {
        // message: sfn.TaskInput.fromDataAt('$'),
        message: sfn.TaskInput.fromObject({
          'Input.$': '$',
        }),
        subject: 'Fargate Start Scaling Out',
      }),
      resultPath: '$.taskresult',

    });
    const svcScaleOut = new sfn.Task(this, 'ServiceScaleOut', {
      task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'svcScaleOut', fargateWatcherFunc.functionArn)),

    });

    const isServiceOverloaded = new sfn.Choice(this, 'IsServiceOverloaded', {
      inputPath: '$.status',
    });
    const isDone = new sfn.Pass(this, 'Done')

    const desire2 = new sfn.Pass(this, 'Desire2', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 2 }),
    })
    // const desire5 = new sfn.Pass(this, 'Desire5', {
    //     outputPath: DISCARD,
    //     result: sfn.Result.fromObject({Desired: 5})
    // })
    const desire10 = new sfn.Pass(this, 'Desire10', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 10 }),
    })
    const desire15 = new sfn.Pass(this, 'Desire15', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 15 }),
    })
    const desire20 = new sfn.Pass(this, 'Desire20', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 20 }),
    })

    const chain = sfn.Chain
      .start(getEcsTasks)
      .next(isServiceOverloaded
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 500), desire20
          .next(snsScaleOut
            .next(svcScaleOut
              .next(wait60
                .next(getEcsTasks,
                )))))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 300), desire15
          .next(snsScaleOut,
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 100), desire10
          .next(snsScaleOut,
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 50), desire2
          .next(snsScaleOut,
          ))
        // .when(sfn.Condition.numberLessThanEquals('$.avg', 10), desire2
        //     .next(snsScaleOut
        // ))
        .when(sfn.Condition.numberLessThan('$.avg', 0), isDone)
        .otherwise(wait3
          .next(getEcsTasks),
        ));

    new sfn.StateMachine(this, 'FargateFastAutoscaler', {
      definition: chain,
      timeout: cdk.Duration.hours(24),
    });

    new cdk.CfnOutput(this, 'ClusterARN: ', { value: fgCluster.clusterArn });
    new cdk.CfnOutput(this, 'URL: ', { value: 'http://' + externalListener.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'FargateWatcherLambdaArn: ', { value: fargateWatcherFunc.functionArn });
  }
}
