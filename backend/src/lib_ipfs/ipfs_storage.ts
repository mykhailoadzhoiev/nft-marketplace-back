import { s3 } from '@/lib_common/aws';
import env from '@/lib_common/env';
import StandartResult from '@/lib_common/classes/standard_result';
import * as fs from 'fs-extra';

let isInit = false;
const S3_BUCKET_NAME = env.AWS_S3_IPFS_BUCKET;

export async function init() {
  if (isInit) {
    return;
  }

  let bucketHead;
  let resError;

  try {
    bucketHead = await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise();
  } catch (error) {
    resError = error;
  }
  if (!bucketHead) {
    try {
      await s3
        .createBucket({
          Bucket: S3_BUCKET_NAME,
        })
        .promise();
    } catch (error) {
      console.error(error);
      resError = error;
    }

    try {
      bucketHead = await s3.headBucket({ Bucket: S3_BUCKET_NAME }).promise();
    } catch (error) {
      resError = error;
    }
  }

  if (!bucketHead) {
    console.error(resError);
    throw new Error('s3 is not init!');
  } else {
    isInit = true;
  }
}

export async function objectUpload(file: string, key: string) {
  const res = new StandartResult<string>();

  await new Promise((resolve, reject) => {
    const rs = fs.createReadStream(file);
    const params = {
      Bucket: S3_BUCKET_NAME,
      Body: rs,
      Key: key,
    };

    s3.upload(params, (err, data) => {
      if (err) {
        res.setErrData(err, 500);
        return resolve(1);
      }
      resolve(1);
    });
  });

  return res;
}

export async function getObjectsList(prefix: string, options) {
  const stdRes = new StandartResult<
    {
      name: string;
      size: number;
    }[]
  >();

  const params = {
    Bucket: S3_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: 10000,
  };

  await new Promise((resolve, reject) => {
    s3.listObjects(params)
      .on('error', (err) => {
        stdRes.setCode(500).setErrData(err.stack);
        resolve(1);
      })
      .on('success', (res) => {
        const resData = res.data;
        const data = [];
        if (resData) {
          for (let item of resData.Contents) {
            data.push({
              name: item.Key,
              size: item.Size,
            });
          }
          stdRes.setCode(res.httpResponse.statusCode).setData(data);
          resolve(1);
        } else {
          stdRes.setCode(500);
        }
      })
      .send();
  });

  return stdRes;
}

export async function objectExists(key: string) {
  const stdRes = new StandartResult<string>();

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
  };

  await new Promise((resolve, reject) => {
    s3.headObject(params)
      .on('error', (err) => {
        stdRes.setCode(500).setErrData(err.stack);
        resolve(1);
      })
      .on('success', (res) => {
        stdRes.setCode(res.httpResponse.statusCode);
        resolve(1);
      })
      .send();
  });

  return stdRes;
}

export async function objectDownloadToFile(key: string, file: string) {
  const stdRes = new StandartResult<string>();

  const objectExistsRes = await objectExists(key);
  if (objectExistsRes.isBad) {
    return stdRes.mergeBad(objectExistsRes);
  }

  await new Promise((resolve, reject) => {
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: key,
    };

    let isError = false;
    const ws = fs.createWriteStream(file);
    const rs = s3.getObject(params).createReadStream();
    rs.pipe(ws);

    rs.on('error', (error) => {
      isError = true;
      stdRes.setCode(500).setErrData(error.stack);
      resolve(isError);
    });
    ws.on('error', (err) => {
      isError = true;
      stdRes.setCode(500).setErrData(err.stack);
      resolve(isError);
    });
    ws.on('close', async () => {
      if (!isError) {
        resolve(isError);
      }
    });
  });

  return stdRes;
}

export async function deleteObject(key: string) {
  const stdRes = new StandartResult<string>();

  const objectExistsRes = await objectExists(key);
  if (objectExistsRes.isBad) {
    return stdRes.mergeBad(objectExistsRes);
  }

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    return stdRes.setCode(500).setErrData(error.stack);
  }

  return stdRes;
}
