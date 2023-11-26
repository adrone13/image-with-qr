import * as fs from 'fs/promises';

import sharp from 'sharp';
import QRGenerator from 'qrcode';

interface Dimensions {
  readonly width: number | null;
  readonly height: number | null;
}

export interface ApplyToImageOptions {
  readonly image: Buffer;
  readonly data: string;
  readonly qrScale?: number
}

export class QRCode {
  private readonly OUTPUT_IMAGE_SIZE = 1000;
  private readonly BASE_IMAGE_SCALE = 0.8;
  private readonly PADDING_SCALE = 0.02;
  private readonly QR_CODE_BACKDROP_SCALE = 0.2;

  async applyToImage(options: ApplyToImageOptions): Promise<Buffer> {
    this.validateOptions(options);

    const { image, data } = options;

    const padding = Math.floor(this.OUTPUT_IMAGE_SIZE * this.PADDING_SCALE);
    const imageWidth = Math.floor(this.OUTPUT_IMAGE_SIZE * this.BASE_IMAGE_SCALE);
    const scaledBaseImage = await this.resize(image, { width: imageWidth, height: null });
    
    const qrBackdropScale = options.qrScale ? options.qrScale / 100 : this.QR_CODE_BACKDROP_SCALE;
    const qrBackdropHeight = Math.floor(this.OUTPUT_IMAGE_SIZE * qrBackdropScale);
    // const qrBackdropHeight = Math.floor(this.OUTPUT_IMAGE_SIZE * this.QR_CODE_BACKDROP_SCALE);
    const qrWidth = Math.floor(qrBackdropHeight * 0.75);
    const qrBackdropPadding = Math.floor((qrBackdropHeight - qrWidth) / 2);

    const qrBackdrop = await this.resize(
    await this.getAsset('backdrop.svg'), 
    { 
      width: null, 
      height: qrBackdropHeight,
    });

    const qrCodeImage = await this.generateQr({
      data: data,
      width: qrWidth,
    });

    return sharp({
      create: {
        width: this.OUTPUT_IMAGE_SIZE,
        height: this.OUTPUT_IMAGE_SIZE,
        channels: 4,
        background: '#ffffff',
      },
    })
      .composite([
        {
          input: scaledBaseImage,
        },
        {
          input: qrBackdrop,
          top: this.OUTPUT_IMAGE_SIZE - qrBackdropHeight - padding,
          left: padding,
        },
        {
          input: qrCodeImage,
          top: this.OUTPUT_IMAGE_SIZE - qrWidth - padding - qrBackdropPadding,
          left: padding + qrBackdropPadding,
        },
      ])
      .toFormat('png')
      .toBuffer();
  }

  private validateOptions(options: ApplyToImageOptions) {
    if (typeof options.qrScale !== 'undefined' && options.qrScale <= 0) {
      throw new RangeError('qrScale should be larger than 0');
    }
    if (typeof options.qrScale !== 'undefined' && options.qrScale >= 100) {
      throw new RangeError('qrScale should be less than 100');
    }
  }

  private generateQr(options: { data: string; width: number }) {
    return QRGenerator.toBuffer(options.data, {
      errorCorrectionLevel: 'L',
      margin: 0,
      scale: 1,
      width: options.width,
      color: {
        dark: '#ffffff',
        light: '#000000',
      },
    });
  }

  private resize(image: Buffer, dimensions: Dimensions): Promise<Buffer> {
    return sharp(image).resize(dimensions.width, dimensions.height).toBuffer();
  }

  private getAsset(name: string) {
    return fs.readFile(`${__dirname}/../assets/${name}`);
  }
}
