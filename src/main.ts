import * as fs from 'fs/promises';
import * as path from 'path';
import commandLineArgs, { OptionDefinition } from 'command-line-args';

import { QRCode } from './qr-code';

interface Args {
  readonly src: string;
  readonly data: string;
  readonly scale?: number;
}

async function main() {
  const { src, data, scale } = await parseArgs();

  console.log('🚀 Processing...');

  const qrCode = new QRCode();
  const sourceImage = await fs.readFile(src)
  const processedImage = await qrCode.applyToImage({
    image: sourceImage,
    data,
    qrScale: scale,
  });

  const outputPath = path.join(__dirname, `/../image_${Date.now()}.png`);
  await fs.writeFile(outputPath, processedImage);

  console.log(`✅ Result saved to ${outputPath}`);
}

function logUsages() {
  process.stdout.write('\n');
  process.stdout.write('⚙️ Example usages:\n');
  process.stdout.write('    npm run start -- -s ./your-path -d "your qr data"\n');
  process.stdout.write('    npm run start -- --src=./your-path --data="your qr data"\n');
}

async function parseArgs(): Promise<Args> {
  const optionDefinitions: OptionDefinition[] = [
    { name: 'src', alias: 's', type: String },
    { name: 'data', alias: 'd', type: String },
    { name: 'scale', type: Number },
  ];

  const options = commandLineArgs(optionDefinitions);
  
  if (!options.src || !options.data) {
    logUsages();

    process.exit();
  }

  // validate options.src
  try {
    await fs.access(options.src, fs.constants.R_OK);
  } catch (error: any) {
    console.log('STILL RUNNING');

    console.error(`❌ No such file: ${options.src}`);

    process.exit();
  }

  // validate options.data
  const QR_MAX_DATA_SIZE_BYTES = 2953;
  const buff = Buffer.from(options.data, "utf-8");
  if (Buffer.byteLength(buff) > QR_MAX_DATA_SIZE_BYTES)  {
    console.error(`❌ Data should not exceed ${QR_MAX_DATA_SIZE_BYTES} bytes`);
   
    process.exit();
  }


  // validate options.scale
  if (isNaN(options.scale) || options.scale <= 0 || options.scale >= 100) {
    console.error(`❌ Scale should be a valid percentage value`);
   
    process.exit();
  }

  return {
    src: options.src,
    data: options.data,
    scale: options.scale,
  };
}

main();
