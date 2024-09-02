# dify-on-aws

Deploy Dify's Community Edition with a single click to a single AWS EC2 instance (c7g.xlarge), using either CloudFormation or the Cloud Development Kit (CDK).

## use Cloudformation

```
curl -O https://raw.githubusercontent.com/luanluandehaobaoman/dify-on-aws/main/dify.yaml
```

- Import into AWS CloudFormation




## use CDK

```
# clone repo
yarn install
cd packages/cdk
cdk deploy
```

## Dify url：Cloudformation output

http:<ec2 public IP> //xx.xx.xx.xx:80

![1717651748399](images/README/1717651748399.png)

## Dify Workshop with Amazon Bedrock & Sagemaker
[Rapidly Build GenAI Apps with Dify](https://catalog.us-east-1.prod.workshops.aws/workshops/2c19fcb1-1f1c-4f52-b759-0ca4d2ae2522/zh-CN)
