import fs from "fs";
import { create, IPFSHTTPClient } from "ipfs-http-client";

let ipfs: IPFSHTTPClient | undefined;

try {
  ipfs = create({
    url: "https://ipfs.infura.io:5001/api/v0",
  });
} catch (error) {
  console.error("IPFS error ", error);
  process.exit(1);
}

const main = async () => {
  console.log("\n\n Loading assets.json...\n");
  const assets = JSON.parse(fs.readFileSync("build/assets.json").toString());

  const params: any = [];
  for (const index in assets) {
    params.push({
      path: `${index}.json`,
      content: JSON.stringify(assets[index]),
    });
  }

  const uploaded = await (ipfs as IPFSHTTPClient).addAll(params, {
    wrapWithDirectory: true,
  });

  let cid: string = "";
  try {
    for await (const file of uploaded) {
      if (file.path.length === 0) {
        cid = file.cid.toString();
      }
    }
  } catch (err) {
    console.error(err);
  }

  console.log(
    `NFT Metadata uploaded. Directory CID: ${cid}, Number: ${assets.length}, Directory Path: https://ipfs.io/ipfs/${cid}/`
  );

  const nftMetadata = {
    cid: cid,
    ipfs_dir: `https://ipfs.io/ipfs/${cid}/`,
    supply: assets.length,
    ipfs_start: `https://ipfs.io/ipfs/${cid}/0.json`,
    ipfs_end: `https://ipfs.io/ipfs/${assets.length - 1}/0.json`,
    assets: assets,
  };

  fs.writeFileSync("build/uploaded.json", JSON.stringify(nftMetadata));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
