import { Request, Response } from 'express';
import * as IpfsOms from '@/lib_ipfs/ipfs_oms';
import IpfsRequest from '@/lib_common/classes/ipfs_request';
import { ThrowExUnknown } from '@/lib_common/ex_errors';

function parseSha256Param(sha256Param: string, query: { [key: string]: string }) {
  let ipfsRequest: IpfsRequest;

  let match = sha256Param.match(/^([0-9a-f]*)(\.(\w+))$/);
  if (match) {
    const sha256 = match[1];
    ipfsRequest = new IpfsRequest(sha256);
    ipfsRequest.format = match[3];
  }

  match = sha256Param.match(/^([0-9a-f]*)(\:(\d+))?$/);
  if (!ipfsRequest && match) {
    const sha256 = match[1];

    ipfsRequest = new IpfsRequest(sha256);

    if (match[3]) {
      const temp = match[3];
      if (!Number.isNaN(temp)) {
        ipfsRequest.thumb = {
          type: 'width',
          name: temp,
        };
      }
    }
  }

  match = sha256Param.match(/^([0-9a-f]*)(\:(fullhd))?$/);
  if (!ipfsRequest && match) {
    const sha256 = match[1];
    ipfsRequest = new IpfsRequest(sha256);
    if (match[3]) {
      ipfsRequest.thumb = {
        type: 'name',
        name: match[3],
      };
    }
  }

  if (!ipfsRequest) {
    ipfsRequest = new IpfsRequest(sha256Param);
  }

  if (query.w) {
    ipfsRequest.thumb = {
      type: 'width',
      name: query.w,
    };
  } else if (query.n) {
    ipfsRequest.thumb = {
      type: 'name',
      name: query.n,
    };
  }

  return ipfsRequest;
}

function getIpfsObjectBySha256AndArgsAndQuery(sha256: string, args: string, query: { [key: string]: string }) {
  const ipfsRequest = new IpfsRequest(sha256);

  const match = args.match(/^(image|video)(\.(\w+))?$/);
  if (match) {
    ipfsRequest.type = match[1] as 'image' | 'video';
    if (match[3]) {
      ipfsRequest.format = match[3];
    }
  }

  if (query.w) {
    ipfsRequest.thumb = {
      type: 'width',
      name: query.w,
    };
  } else if (query.n) {
    ipfsRequest.thumb = {
      type: 'name',
      name: query.n,
    };
  }

  return ipfsRequest;
}

/**
 * @method head
 * @sheme /:sha256Param
 */
export async function headBySha256(req: Request, res: Response) {
  const sha256Param = req.params['sha256Param'];
  const query = req.query as { [key: string]: string };
  const ipfsRequest = parseSha256Param(sha256Param, query);

  const getIpfsCachItemRes = await IpfsOms.getIpfsCacheItemByIpfsRequest(ipfsRequest);
  if (getIpfsCachItemRes.isBad) {
    console.error(getIpfsCachItemRes.errData);
    if (getIpfsCachItemRes.data) {
      getIpfsCachItemRes.data.processEnd();
    }
    return ThrowExUnknown(res, getIpfsCachItemRes.code);
  }
  const cacheItem = getIpfsCachItemRes.data;

  const ipfsCacheItemHeaders = cacheItem.getHeaders();
  res.set(ipfsCacheItemHeaders);

  cacheItem.statsEmitHead();

  return res.send('');
}

/**
 * @method get
 * @sheme /:sha256Param
 */
export async function getBySha256(req: Request, res: Response) {
  const sha256Param = req.params['sha256Param'];
  const query = req.query as { [key: string]: string };
  const ipfsRequest = parseSha256Param(sha256Param, query);

  const getIpfsCachItemRes = await IpfsOms.getIpfsCacheItemByIpfsRequest(ipfsRequest);
  if (getIpfsCachItemRes.isBad) {
    console.error(getIpfsCachItemRes.errData);
    if (getIpfsCachItemRes.data) {
      getIpfsCachItemRes.data.processEnd();
    }
    return ThrowExUnknown(res, getIpfsCachItemRes.code);
  }
  const cacheItem = getIpfsCachItemRes.data;

  const ipfsCacheItemHeaders = cacheItem.getHeaders();
  res.set(ipfsCacheItemHeaders);

  res.sendFile(cacheItem.pathFile);

  cacheItem.statsEmitGet();
}

/**
 * @method head
 * @sheme /:sha256/:args
 */
export async function headBySha256AndArgs(req: Request, res: Response) {
  const sha256 = req.params['sha256'];
  const args = req.params['args'];
  const query = req.query as { [key: string]: string };
  const ipfsRequest = getIpfsObjectBySha256AndArgsAndQuery(sha256, args, query);

  const getIpfsCachItemRes = await IpfsOms.getIpfsCacheItemByIpfsRequest(ipfsRequest);
  if (getIpfsCachItemRes.isBad) {
    console.error(getIpfsCachItemRes.errData);
    if (getIpfsCachItemRes.data) {
      getIpfsCachItemRes.data.processEnd();
    }
    return ThrowExUnknown(res, getIpfsCachItemRes.code);
  }
  const cacheItem = getIpfsCachItemRes.data;

  const ipfsCacheItemHeaders = cacheItem.getHeaders();
  res.set(ipfsCacheItemHeaders);

  cacheItem.statsEmitHead();

  return res.send('');
}

/**
 * @method head
 * @sheme /:sha256/:args
 */
export async function getBySha256AndArgs(req: Request, res: Response) {
  const sha256 = req.params['sha256'];
  const args = req.params['args'];
  const query = req.query as { [key: string]: string };
  const ipfsRequest = getIpfsObjectBySha256AndArgsAndQuery(sha256, args, query);

  const getIpfsCachItemRes = await IpfsOms.getIpfsCacheItemByIpfsRequest(ipfsRequest);
  if (getIpfsCachItemRes.isBad) {
    console.error(getIpfsCachItemRes.errData);
    if (getIpfsCachItemRes.data) {
      getIpfsCachItemRes.data.processEnd();
    }
    return ThrowExUnknown(res, getIpfsCachItemRes.code);
  }
  const cacheItem = getIpfsCachItemRes.data;

  const ipfsCacheItemHeaders = cacheItem.getHeaders();
  res.set(ipfsCacheItemHeaders);

  res.sendFile(cacheItem.pathFile);

  cacheItem.statsEmitGet();
}
