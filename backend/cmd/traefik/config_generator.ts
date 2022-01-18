import * as YAML from 'json-to-pretty-yaml';
import * as fs from 'fs-extra';
import * as path from 'path';
import trkConf from 'cluster/traefik';
import * as IpfsRanges from '@/lib_ipfs/ipfs_ranges';

const PATH_CLUSTER_TRAEFIK_DIR = path.resolve('cluster', 'traefik');
const PATH_CLUSTER_TRAEFIK_CONF = path.resolve(PATH_CLUSTER_TRAEFIK_DIR, 'traefik.yml');
const PATH_CLUSTER_TRAEFIK_PROVIDER_CONF = path.resolve(PATH_CLUSTER_TRAEFIK_DIR, 'provider.yml');

export default async function (argv: { _: string[] }) {
  const BACKEND_SRV = 'MainBackend';
  const BACKEND_SHA256_SRV_PRIFIX = 'BackendForSha256_';

  const rangesRes = IpfsRanges.generateRanges(2, 3, trkConf.nodes.length);
  const hexRanges = rangesRes.data.hexsRegexs;

  const traefikConfig = {
    entryPoints: {
      http: {
        address: ':4000',
      },
    },
    providers: {
      file: {
        filename: PATH_CLUSTER_TRAEFIK_PROVIDER_CONF,
        watch: true,
      },
    },
  };

  const providerConfig = {
    http: {
      services: (() => {
        const services = {
          [BACKEND_SRV]: {
            loadBalancer: {
              servers: trkConf.nodes.map((v) => {
                return { url: `http://${v.host}:${v.port}/` };
              }),
            },
          },
        };

        for (const index in trkConf.nodes) {
          const ServiceName = BACKEND_SHA256_SRV_PRIFIX + index;
          const node = trkConf.nodes[index];
          services[ServiceName] = {
            loadBalancer: {
              servers: [{ url: `http://${node.host}:${node.port}/` }],
            },
          };
        }

        return services;
      })(),
      routers: (() => {
        const routers = {};

        for (const index in trkConf.nodes) {
          const sha256RouterName = 'Sha256_' + index;
          const node = trkConf.nodes[index];
          routers[sha256RouterName] = {
            rule: 'HostRegexp(`{host:.+}`) && PathPrefix(`/sha256/{id:' + hexRanges[index] + '.*}`)',
            service: BACKEND_SHA256_SRV_PRIFIX + index,
          };
        }

        routers['MainRouter'] = {
          rule: 'HostRegexp(`{host:.+}`)',
          service: BACKEND_SRV,
        };

        return routers;
      })(),
    },
  };

  await fs.mkdirs(PATH_CLUSTER_TRAEFIK_DIR);
  await fs.writeFile(PATH_CLUSTER_TRAEFIK_CONF, YAML.stringify(traefikConfig));
  await fs.writeFile(PATH_CLUSTER_TRAEFIK_PROVIDER_CONF, YAML.stringify(providerConfig));

  console.log(`traefik config created: ${PATH_CLUSTER_TRAEFIK_CONF}`);
  console.log(`traefik file provider created: ${PATH_CLUSTER_TRAEFIK_PROVIDER_CONF}`);

  process.exit(0);
}
