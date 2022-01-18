import * as aws from 'aws-sdk';
import env from '@/lib_common/env';

const s3Config = {} as aws.S3.ClientConfiguration;

if (env.AWS_S3_IS_LOCAL) {
  if (env.AWS_S3_ACCESS_KEY && env.AWS_S3_SECRET_KEY) {
    s3Config.accessKeyId = env.AWS_S3_ACCESS_KEY;
    s3Config.secretAccessKey = env.AWS_S3_SECRET_KEY;
  }

  if (env.AWS_S3_ENDPOINT) {
    s3Config.endpoint = env.AWS_S3_ENDPOINT;
    s3Config.s3ForcePathStyle = true;
    s3Config.signatureVersion = 'v4';
  }
}

export const s3 = new aws.S3(s3Config);
