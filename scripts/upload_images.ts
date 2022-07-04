import fs from "fs";
import path from "path";
import { create, IPFSHTTPClient } from "ipfs-http-client";
import { JSON_TEMPLATE } from "./constant";

let ipfs: IPFSHTTPClient | undefined;

try {
  ipfs = create({
    url: "https://ipfs.infura.io:5001/api/v0",
  });
} catch (error) {
  console.error("IPFS error ", error);
  throw new Error("loading IPFS was failed");
}

const main = async () => {
  const allAssets: any = [];

  console.log("\n\n Loading Images...\n");
  const imagesFolder = "assets/";

  const files = fs.readdirSync(imagesFolder);

  for (const index in files) {
    const filename = files[index];
    const filePath = path.join(imagesFolder, files[index]);
    const stat = fs.lstatSync(filePath);

    if (!stat.isDirectory() && filename !== ".DS_Store") {
      console.log("  Uploading " + files[index] + "...");
      const image = fs.readFileSync(filePath);
      const uploaded = await (ipfs as IPFSHTTPClient).add(image);
      console.log("  Uploaded " + files[index] + " ipfs:", uploaded.path);

      const json = {
        ...JSON_TEMPLATE,
        name: `MYMFT #${index}`,
        image: "https://ipfs.io/ipfs/" + uploaded.path,
      };

      allAssets.push(json);
    }
  }

  fs.writeFileSync("build/assets.json", JSON.stringify(allAssets));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    throw new Error("Excuting failed");
  });
