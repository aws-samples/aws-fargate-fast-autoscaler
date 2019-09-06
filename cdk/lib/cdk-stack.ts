import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
import iam = require("@aws-cdk/aws-iam");
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfn_tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import lambda = require('@aws-cdk/aws-lambda');
import sns = require('@aws-cdk/aws-sns');

import { CfnResource } from "@aws-cdk/core";


const DEFAULT_SNS_TOPIC_ARN = 'arn:aws:sns:ap-northeast-1:903779448426:SNS2IM'
const AWSCLI_LAYER_ARN = 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
const AWSCLI_LAYER_VERSION = '1.16.232'

export class AwsFargateFastAutoscalerStack extends cdk.Stack {
  public readonly fargateWatcherFuncArn: string;
  public readonly layerVersionArn: string;
  public readonly fargateService: ecs.FargateService;
  public readonly fargateTaskDef: ecs.FargateTaskDefinition

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // import default VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    });

    // create a security group that allows all traffic from the same sg
    const sg = new ec2.SecurityGroup(this, 'SharedSecurityGroup', {
      vpc: vpc,
    })
    sg.connections.allowFrom(sg, ec2.Port.allTraffic())


    //sg for HTTP public access
    const httpPublicSecurityGroup = new ec2.SecurityGroup(this, "HttpPublicSecurityGroup", {
      allowAllOutbound: true,
      securityGroupName: 'HttpPublicSecurityGroup',
      vpc: vpc
    });

    httpPublicSecurityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(80));


    // // Fargate Cluster
    const fgCluster = new ecs.Cluster(this, 'fgCluster', {
      vpc: vpc
    });


    // // task iam role
    const taskIAMRole = new iam.Role(this, 'fgDemoTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    });

    taskIAMRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['xray:PutTraceSegments']
    }));

    // ECS task definition
    const demoTaskDef = new ecs.FargateTaskDefinition(this, 'cdk-fargate-demo-taskdef', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole: taskIAMRole,
    })

    this.fargateTaskDef = demoTaskDef

    const mainContainer = demoTaskDef.addContainer('main', {
      image: ecs.ContainerImage.fromAsset('./nginx', {}),
      cpu: 0,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'echo-http-req'
      }),
    })

    const phpContainer = demoTaskDef.addContainer('backend', {
      image: ecs.ContainerImage.fromAsset('./php', {}),
      cpu: 0,
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'echo-http-req'
      })
    })

    //   mainContainer.addLink(phpContainer, 'app')
    mainContainer.addPortMappings({
      containerPort: 80
    })

    phpContainer.addPortMappings({
      containerPort: 2015
    })

    const demoService = new ecs.FargateService(this, 'demo-service', {
      cluster: fgCluster,
      desiredCount: 2,
      taskDefinition: demoTaskDef,
      securityGroup: sg,
    });

    this.fargateService = demoService


    const externalLB = new elbv2.ApplicationLoadBalancer(this, 'external', {
      vpc: vpc,
      internetFacing: true,
      securityGroup: httpPublicSecurityGroup,
    });

    const externalListener = externalLB.addListener('PublicListener', {
      port: 80
    });


    const healthCheckDefault = {
      "port": 'traffic-port',
      "path": '/',
      "intervalSecs": 30,
      "timeoutSeconds": 5,
      "healthyThresholdCount": 5,
      "unhealthyThresholdCount": 2,
      "healthyHttpCodes": "200,301,302"
    };

    externalListener.addTargets('fg-echo-req', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: healthCheckDefault,
      targets: [demoService],
      deregistrationDelay: cdk.Duration.seconds(3)
    });


    // SAM
    // IAM role for lambda
    const lambdaRole = new iam.Role(this, 'lambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'))
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'))

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
      ]
    }));


    lambdaRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ]
    }));

    // const uniqueId = crypto.createHash('md5').update(this.node.path).digest("hex");
    this.templateOptions.transforms = ['AWS::Serverless-2016-10-31']; // required for AWS::Serverless
    const resource = new CfnResource(this, 'Resource', {
      type: 'AWS::Serverless::Application',
      properties: {
        Location: {
          ApplicationId: AWSCLI_LAYER_ARN,
          SemanticVersion: AWSCLI_LAYER_VERSION
        },
        Parameters: {}
      }
    })
    this.layerVersionArn = cdk.Token.asString(resource.getAtt('Outputs.LayerVersionArn'));

    const fargateWatcherFunc = new lambda.Function(this, 'fargateWatcherFunc', {
      runtime: lambda.Runtime.PROVIDED,
      handler: 'main',
      code: lambda.Code.fromAsset('./sam/fargateWatcherFunc/func.d'),
      layers: [lambda.LayerVersion.fromLayerVersionArn(this, 'AwsCliLayer', this.layerVersionArn)],
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      role: lambdaRole,
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
      securityGroup: sg,
      environment: {
        cluster: fgCluster.clusterName,
        service: demoService.serviceName,
        disable_scalein: 'yes',
        region: `${this.region}`
      },
    });

    this.fargateWatcherFuncArn = fargateWatcherFunc.functionArn

    // step function
    const wait3 = new sfn.Wait(this, 'Wait 3 Seconds', {
      // time: sfn.WaitTime.secondsPath('$.wait_time') 
      time: sfn.WaitTime.duration(cdk.Duration.seconds(3))
    });
    const wait60 = new sfn.Wait(this, 'Wait 60 Seconds', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(60))
    });

    const getEcsTasks = new sfn.Task(this, 'GetECSTasks', {
      task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'getEcsTasks', fargateWatcherFunc.functionArn)),
      resultPath: '$.status',
    });

    const snsScaleOut = new sfn.Task(this, 'SNSScaleOut', {
      task: new sfn_tasks.PublishToTopic(sns.Topic.fromTopicArn(this, 'snsTopic', DEFAULT_SNS_TOPIC_ARN), {
        // message: sfn.TaskInput.fromDataAt('$'),
        message: sfn.TaskInput.fromObject({
          'Input.$': '$'
        }),
        subject: "Fargate Start Scaling Out",
      }),
      resultPath: "$.taskresult",

    });
    const svcScaleOut = new sfn.Task(this, 'ServiceScaleOut', {
      task: new sfn_tasks.InvokeFunction(lambda.Function.fromFunctionArn(this, 'svcScaleOut', fargateWatcherFunc.functionArn)),

    });

    const isServiceOverloaded = new sfn.Choice(this, 'IsServiceOverloaded', {
      inputPath: '$.status'
    });
    const isDone = new sfn.Pass(this, 'Done')

    const desire2 = new sfn.Pass(this, 'Desire2', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 2 })
    })
    // const desire5 = new sfn.Pass(this, 'Desire5', {
    //     outputPath: DISCARD,
    //     result: sfn.Result.fromObject({Desired: 5})
    // })
    const desire10 = new sfn.Pass(this, 'Desire10', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 10 })
    })
    const desire15 = new sfn.Pass(this, 'Desire15', {
      outputPath: '$',
      result: sfn.Result.fromObject({ Desired: 15 })
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
                .next(getEcsTasks
                )))))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 300), desire15
          .next(snsScaleOut
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 100), desire10
          .next(snsScaleOut
          ))
        .when(sfn.Condition.numberGreaterThanEquals('$.avg', 50), desire2
          .next(snsScaleOut
          ))
        // .when(sfn.Condition.numberLessThanEquals('$.avg', 10), desire2
        //     .next(snsScaleOut
        // ))
        .when(sfn.Condition.numberLessThan('$.avg', 0), isDone)
        .otherwise(wait3
          .next(getEcsTasks)
        ));

    new sfn.StateMachine(this, 'FargateFastAutoscaler', {
      definition: chain,
      timeout: cdk.Duration.hours(24)
    });

    new cdk.CfnOutput(this, 'ClusterARN: ', { value: fgCluster.clusterArn });
    new cdk.CfnOutput(this, 'URL: ', { value: 'http://' + externalListener.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'FargateWatcherLambdaArn: ', { value: fargateWatcherFunc.functionArn });

  }

}
