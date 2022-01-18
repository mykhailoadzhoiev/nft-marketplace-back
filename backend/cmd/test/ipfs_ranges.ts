import prisma from '@/lib_db/prisma';
import * as IpfsRanges from '@/lib_ipfs/ipfs_ranges';

export default async function (argv: { _: string[] }) {
  const res = IpfsRanges.generateRanges(2, 3, 12);

  console.log(res.data);

  process.exit(0);
}
